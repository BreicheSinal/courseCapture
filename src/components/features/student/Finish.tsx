import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import type { StudentCourse } from "@/types/supabase";
import { CertificateActions } from "./CertificateActions";
import { Parts } from "./shared";

/** Canvas S6 · Finish: course complete, scores, and the certificate (downloadable PDF, decision #29). */
export function Finish({
  course,
  studentName,
  teacherName,
  classLabel,
}: {
  course: StudentCourse;
  studentName: string;
  teacherName: string;
  classLabel: string;
}) {
  const t = useTranslations("student.finish");
  const format = useFormatter();
  const finished = course.last_done_at ? new Date(course.last_done_at) : null;
  const finishedLong = finished ? format.dateTime(finished, { year: "numeric", month: "long", day: "numeric" }) : null;
  const finishedShort = finished ? format.dateTime(finished, { month: "short", day: "numeric" }) : null;
  const quiz = course.quiz_answered
    ? format.number(course.quiz_correct / course.quiz_answered, { style: "percent" })
    : t("noQuiz");
  const details = [classLabel, teacherName, finishedLong].filter((d): d is string => !!d);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <span
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-pill bg-accent-soft text-accent-text"
        >
          <Icon name="award" width={30} height={30} />
        </span>
        <p className="eyebrow text-success">{t("eyebrow")}</p>
        <h1 id="page-title" tabIndex={-1} className="large-title focus:outline-none">
          <bdi lang={course.content_locale}>{course.title}</bdi>
        </h1>
      </div>

      <div className="cc-stats grid-cols-2">
        <div className="cc-stat">
          <span>{t("quizScore")}</span>
          <b>{quiz}</b>
          {course.quiz_answered > 0 && (
            <span>{t("correctOf", { right: course.quiz_correct, total: course.quiz_answered })}</span>
          )}
        </div>
        <div className="cc-stat">
          <span>{t("modules")}</span>
          <b>{t("modulesOf", { done: course.modules_done, total: course.module_count })}</b>
          {finishedShort && <span>{t("finishedOn", { date: finishedShort })}</span>}
        </div>
      </div>

      <Card
        as="section"
        aria-label={t("certificate")}
        className="flex flex-col items-center gap-2 border-2 border-accent px-6 py-8 text-center"
      >
        <span className="eyebrow text-accent-text">{t("certificate")}</span>
        <span className="subhead text-ink-muted">{t("certifies")}</span>
        <span className="title">
          <bdi>{studentName}</bdi>
        </span>
        <span className="callout">
          {t.rich("completed", {
            title: course.title,
            b: (c) => (
              <strong>
                <bdi lang={course.content_locale}>{c}</bdi>
              </strong>
            ),
          })}
        </span>
        <span aria-hidden="true" className="my-2 h-px w-24 bg-line-strong" />
        <span className="footnote text-ink-muted">
          <Parts parts={details} />
        </span>
      </Card>

      <CertificateActions
        file={t("fileName", { title: course.title })}
        lines={{
          heading: t("certificate"),
          certifies: t("certifies"),
          name: studentName,
          completed: t("completedPlain", { title: course.title }),
          details,
          quizLabel: t("quizScore"),
          quiz,
        }}
        shareText={t("shareText", { title: course.title })}
      />
      <Link href="/student" className={buttonClasses({ variant: "ghost", block: true })}>
        {t("home")}
      </Link>
    </div>
  );
}
