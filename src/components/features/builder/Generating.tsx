"use client";

import { useActionState, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Steps } from "@/components/ui/Steps";
import { getJobStatus, retryGeneration, type JobStatus, type RetryState } from "@/lib/generation/actions";

type RowState = "done" | "working" | "queued" | "skipped";

/**
 * T2 · Generating: step progress for the background job (FR-9). Polls the job
 * every few seconds; the teacher can leave and come back. On success it moves
 * on to review; on failure it says why and offers "Try again".
 */
export function Generating({
  courseId,
  title,
  initial,
  back,
  sourceKind,
}: {
  courseId: string;
  title: string;
  initial: JobStatus;
  back: { href: string; label: string };
  sourceKind: "pdf" | "pptx" | "text" | "paste";
}) {
  const t = useTranslations("teacher.generating");
  const tn = useTranslations("teacher.newCourse");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [retryState, retry, retrying] = useActionState<RetryState, FormData>(retryGeneration, undefined);

  useEffect(() => {
    if (status.step === "done") {
      router.replace(`/teacher/courses/${courseId}/review?generated=1`);
      return;
    }
    if (status.step === "failed") return;
    const timer = setInterval(async () => {
      const next = await getJobStatus(courseId).catch(() => null);
      if (next) setStatus(next);
    }, 2500);
    return () => clearInterval(timer);
  }, [status.step, courseId, router]);

  const order = ["queued", "reading", "writing", "drawing", "done"] as const;
  const at = status.step === "failed" ? -1 : order.indexOf(status.step);
  const rowState = (row: "reading" | "writing" | "drawing"): RowState => {
    const i = order.indexOf(row);
    if (row === "drawing" && status.step === "done" && status.modulesDrawn === 0 && status.modulesTotal > 0)
      return "skipped";
    return at > i ? "done" : at === i ? "working" : "queued";
  };

  const readDetail =
    status.pagesTotal == null
      ? null
      : sourceKind === "pptx"
        ? t("slides", { count: status.pagesTotal })
        : status.pagesScanned
          ? t("pagesScanned", { count: status.pagesTotal, scanned: status.pagesScanned })
          : sourceKind === "pdf"
            ? t("pages", { count: status.pagesTotal })
            : null;
  const writeDetail =
    status.chunksTotal > 1
      ? t("partOf", { n: Math.min(status.chunksDone + 1, status.chunksTotal), total: status.chunksTotal })
      : null;
  const drawDetail = status.modulesTotal
    ? t("moduleOf", { n: Math.min(status.modulesDrawn + 1, status.modulesTotal), total: status.modulesTotal })
    : null;

  const line =
    status.step === "queued"
      ? t("line_queued")
      : status.step === "reading"
        ? t("line_reading")
        : status.step === "writing"
          ? status.chunksTotal > 1
            ? t("line_writingPart", {
                n: Math.min(status.chunksDone + 1, status.chunksTotal),
                total: status.chunksTotal,
              })
            : t("line_writing")
          : status.step === "drawing"
            ? t("line_drawing", { n: status.modulesDrawn, total: status.modulesTotal })
            : t("line_done");

  const failed = status.step === "failed";

  return (
    <div className="flex flex-col gap-5">
      <Steps
        label={tn("steps.label")}
        steps={[tn("steps.source"), tn("steps.generate"), tn("steps.review")]}
        current={1}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {failed ? (
          <Card as="section" aria-labelledby="gen-title" className="flex flex-col gap-4 border border-danger">
            <span className="subhead flex items-center gap-1 font-semibold text-danger">
              <Icon name="alert" width={16} height={16} />
              {t("failed")}
            </span>
            <h2 id="gen-title" className="title">
              <bdi>{title}</bdi>
            </h2>
            <p className="body" role="alert">
              {t(`errors.${(status.error ?? "generic") as "generic"}`)}
            </p>
            <div className="flex flex-wrap gap-2">
              {status.canRetry && (
                <form action={retry}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="course" value={courseId} />
                  <Button type="submit" variant="primary" busy={retrying}>
                    <Icon name="refresh" />
                    {retrying ? t("retrying") : t("retry")}
                  </Button>
                </form>
              )}
              <Link href="/teacher/courses/new" className={buttonClasses({ variant: "secondary" })}>
                {t("uploadAnother")}
              </Link>
            </div>
            {retryState?.error && (
              <p className="subhead text-danger" role="alert">
                {tn(`errors.${retryState.error}`)}
              </p>
            )}
          </Card>
        ) : (
          <Card as="section" aria-labelledby="gen-title" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow text-accent-text">{t("eyebrow")}</span>
              <h2 id="gen-title" className="title">
                {t("heading")}
              </h2>
              <p className="subhead text-ink-muted" aria-live="polite">
                {line}
              </p>
            </div>
            <div
              className="cc-progress"
              role="progressbar"
              aria-label={t("progressLabel")}
              aria-valuenow={status.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${status.percent}%` }} />
            </div>
            <ul className="cc-joblist">
              <Row label={t("row_read")} detail={readDetail} state={rowState("reading")} />
              <Row label={t("row_write")} detail={writeDetail} state={rowState("writing")} />
              <Row label={t("row_draw")} detail={drawDetail} state={rowState("drawing")} />
            </ul>
          </Card>
        )}
        <aside className="flex flex-col gap-3">
          {!failed && (
            <div className="cc-notice subhead">
              <Icon name="clock" />
              <p>{t.rich("leaveNote", { strong: (c) => <strong>{c}</strong> })}</p>
            </div>
          )}
          <Link href={back.href} className={buttonClasses({ variant: "secondary", block: true })}>
            {back.label}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, detail, state }: { label: string; detail: string | null; state: RowState }) {
  const t = useTranslations("teacher.generating");
  return (
    <li>
      <span
        className={
          state === "working"
            ? "callout flex-1 font-semibold"
            : state === "queued"
              ? "callout flex-1 text-ink-muted"
              : "callout flex-1"
        }
      >
        {label}
        {detail && state !== "queued" && <span className="footnote block text-ink-muted">{detail}</span>}
      </span>
      {state === "done" && (
        <span className="footnote flex items-center gap-1 font-semibold text-success">
          <Icon name="check" width={15} height={15} />
          {t("state_done")}
        </span>
      )}
      {state === "working" && (
        <span className="footnote flex items-center gap-2 font-semibold text-accent-text">
          <span className="size-2 rounded-pill bg-accent" aria-hidden="true" />
          {t("state_working")}
        </span>
      )}
      {state === "queued" && <span className="footnote text-ink-muted">{t("state_queued")}</span>}
      {state === "skipped" && <span className="footnote text-ink-muted">{t("state_skipped")}</span>}
    </li>
  );
}
