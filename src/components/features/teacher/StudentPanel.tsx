"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { removeStudent } from "@/lib/classes/actions";
import type { StudentModule } from "@/lib/classes/queries";
import { isolate } from "./rich";

/** Canvas T12 · Student panel: one student's progress in a course, over the roster. */
export function StudentPanel({
  classId,
  className,
  student,
  courseId,
  courseTitle,
  modules,
}: {
  classId: string;
  className: string;
  student: { id: string; name: string; email: string; joined_at: string };
  courseId: string | null;
  courseTitle: string | null;
  modules: StudentModule[];
}) {
  const t = useTranslations("teacher.student");
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const removeRef = useRef<HTMLButtonElement>(null);
  const [state, action, removing] = useActionState(removeStudent, undefined);

  // Back to the roster, with focus on this student's row (the panel's opener).
  const close = useCallback(() => {
    const qs = new URLSearchParams({ focus: student.id });
    if (courseId) qs.set("course", courseId);
    router.push(`/teacher/classes/${classId}/students?${qs}`, { scroll: false });
  }, [router, classId, courseId, student.id]);

  const done = modules.filter((m) => m.done).length;
  const answered = modules.filter((m) => m.quiz);
  const right = answered.filter((m) => m.quiz === "correct").length;
  const quizShare = answered.length ? right / answered.length : null;

  return (
    <Dialog
      onClose={removing ? () => {} : close}
      className="relative max-w-lg gap-5"
      title={student.name}
      description={
        <span className="flex items-center gap-3">
          <Avatar name={student.name} size="lg" decorative />
          <span className="footnote text-ink-muted">
            {t("joined", { date: format.dateTime(new Date(student.joined_at), { month: "short", day: "numeric" }) })}
            {" · "}
            <span dir="ltr">{student.email}</span>
          </span>
        </span>
      }
    >
      <IconButton icon="close" label={t("close")} onClick={close} className="absolute end-4 top-4" />

      {courseTitle ? (
        <>
          <div className="cc-stats grid-cols-2">
            <div className="cc-stat">
              <span>
                <bdi>{courseTitle}</bdi>
              </span>
              <b>
                {format.number(done)}/{format.number(modules.length)}
              </b>
              <span>{t("modulesDone")}</span>
            </div>
            <div className="cc-stat">
              <span>{t("quickChecks")}</span>
              <b>{quizShare === null ? "—" : format.number(quizShare, { style: "percent" })}</b>
              <span>{quizShare === null ? t("noQuizYet") : t("firstTry")}</span>
            </div>
          </div>
          <section aria-labelledby="mods" className="flex flex-col gap-2">
            <h3 id="mods" className="eyebrow text-ink-muted">
              {t("modules")}
            </h3>
            {modules.length === 0 ? (
              <p className="subhead text-ink-muted">{t("noModules")}</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {modules.map((m) => (
                  <li key={m.position} className="flex min-h-control items-center gap-3 border-b border-line py-2 last:border-b-0">
                    <span className="callout min-w-0 flex-1 truncate">
                      {m.position} · <bdi>{m.heading}</bdi>
                    </span>
                    {m.quiz && (
                      <span className="footnote flex-none text-ink-muted">
                        {m.quiz === "correct" ? t("quizRight") : t("quizWrong")}
                      </span>
                    )}
                    {m.done ? (
                      <span className="footnote flex flex-none items-center gap-1 font-semibold text-success">
                        <Icon name="check" width={14} height={14} />
                        {t("done")}
                      </span>
                    ) : (
                      <span className="footnote flex-none text-ink-muted">{t("notStarted")}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="subhead text-ink-muted">{t("noCourses")}</p>
      )}

      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="class" value={classId} />
        <input type="hidden" name="student" value={student.id} />
        {confirming ? (
          <>
            <p className="subhead" id="remove-help">
              {t.rich("removeConfirm", { ...isolate, name: student.name, class: className })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={removing}
                onClick={() => {
                  setConfirming(false);
                  // The confirm buttons go away: put focus back on the button that opened them.
                  requestAnimationFrame(() => removeRef.current?.focus());
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" variant="danger" busy={removing} className="flex-1" aria-describedby="remove-help" autoFocus>
                {removing ? t("removing") : t("removeYes")}
              </Button>
            </div>
          </>
        ) : (
          <button
            ref={removeRef}
            type="button"
            className="cc-btn cc-btn--secondary cc-btn--block text-danger"
            onClick={() => setConfirming(true)}
          >
            {t("remove")}
          </button>
        )}
        {state?.error && (
          <p role="alert" className="footnote text-danger">
            {t("removeFailed")}
          </p>
        )}
      </form>
    </Dialog>
  );
}
