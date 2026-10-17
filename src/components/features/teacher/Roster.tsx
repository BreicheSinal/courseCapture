"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { isolate } from "./rich";
import type { ClassCourseStat, RosterRow } from "@/types/supabase";

type Sort = "progress" | "quiz" | "name";

/** Canvas T11 · Roster: pick a course, sort, and open a student. */
export function Roster({
  classId,
  joinCode,
  students,
  courses,
  courseId,
  notice,
  focusStudent,
}: {
  classId: string;
  joinCode: string;
  students: RosterRow[];
  courses: ClassCourseStat[];
  courseId: string | null;
  notice?: "removed";
  /** Student whose row gets focus (coming back from their panel). */
  focusStudent?: string;
}) {
  const t = useTranslations("teacher.roster");
  const format = useFormatter();
  const router = useRouter();
  const [sort, setSort] = useState<Sort>(courseId ? "progress" : "name");
  const toast = useToast();

  // Back from a student's panel: focus their row. After a removal: focus the page heading.
  useEffect(() => {
    const target = focusStudent
      ? document.querySelector<HTMLElement>(`[data-student="${focusStudent}"]`)
      : notice === "removed"
        ? document.getElementById("page-title")
        : null;
    target?.focus();
  }, [focusStudent, notice]);
  const course = courses.find((c) => c.course_id === courseId) ?? null;
  const total = course?.module_count ?? 0;

  if (students.length === 0) {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(joinCode);
        toast(t("copied"), "success");
      } catch {
        toast(t("copyFailed"), "error");
      }
    };
    return (
      <>
        {notice === "removed" && <RemovedNote />}
        <EmptyState
          icon="classes"
          title={t("emptyTitle")}
          text={t.rich("emptyText", { ...isolate, code: joinCode })}
          actions={
            <Button variant="secondary" onClick={copy}>
              {t("copyCode")}
            </Button>
          }
        />
      </>
    );
  }

  const quizPct = (s: RosterRow) => (s.quiz_first_total > 0 ? s.quiz_first_correct / s.quiz_first_total : null);
  const sorted = [...students].sort((a, b) => {
    if (sort === "progress" && b.modules_done !== a.modules_done) return b.modules_done - a.modules_done;
    if (sort === "quiz" && (quizPct(b) ?? -1) !== (quizPct(a) ?? -1)) return (quizPct(b) ?? -1) - (quizPct(a) ?? -1);
    return (a.full_name || a.email).localeCompare(b.full_name || b.email);
  });

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {notice === "removed" && <RemovedNote />}
      <div className="flex flex-wrap items-end gap-4">
        {courses.length > 0 ? (
          <Select
            label={t("course")}
            className="min-w-56 flex-1 sm:flex-none"
            value={courseId ?? ""}
            onChange={(e) => router.replace(`/teacher/classes/${classId}/students?course=${e.target.value}`, { scroll: false })}
            hint={
              course?.due_date
                ? t("due", { date: format.dateTime(new Date(`${course.due_date}T00:00:00Z`), { month: "short", day: "numeric" }) })
                : undefined
            }
          >
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.title}
              </option>
            ))}
          </Select>
        ) : (
          <p className="subhead text-ink-muted">{t("noCourses")}</p>
        )}
        <fieldset className="m-0 flex items-center gap-2 border-0 p-0">
          <legend className="sr-only">{t("sortBy")}</legend>
          <span aria-hidden="true" className="footnote text-ink-muted">
            {t("sort")}
          </span>
          {(course ? (["progress", "quiz", "name"] as const) : (["name"] as const)).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={
                sort === s
                  ? "cc-btn cc-btn--sm min-h-control rounded-pill border border-accent bg-accent-soft text-accent-text"
                  : "cc-btn cc-btn--sm cc-btn--secondary min-h-control rounded-pill"
              }
            >
              {t(`sort_${s}`)}
            </button>
          ))}
        </fieldset>
      </div>

      <ul aria-label={t("students")} className="cc-entities m-0 list-none p-0">
        {sorted.map((s) => {
          const name = s.full_name || s.email;
          const pct = quizPct(s);
          const note = !course
            ? t("joined", { date: format.dateTime(new Date(s.joined_at), { month: "short", day: "numeric" }) })
            : s.modules_done === 0
              ? t("notStarted")
              : pct === null
                ? t("noQuiz")
                : t("quiz", { pct });
          return (
            <li key={s.student_id} className="border-b border-line last:border-b-0">
              <Link
                href={`/teacher/classes/${classId}/students/${s.student_id}${courseId ? `?course=${courseId}` : ""}`}
                className="cc-entity border-0"
                data-student={s.student_id}
              >
                <span className="cc-entity__lead">
                  <Avatar name={name} tone="soft" decorative />
                </span>
                <span className="cc-entity__body">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="cc-entity__title">
                      <bdi>{name}</bdi>
                    </span>
                    <span
                      className={
                        course && s.modules_done === 0
                          ? "footnote flex-none font-semibold text-warning"
                          : "footnote flex-none text-ink-muted"
                      }
                    >
                      {note}
                    </span>
                  </span>
                  {course && (
                    <span className="flex items-center gap-3">
                      <Progress value={s.modules_done} max={total} label={t("progressLabel", { name })} className="flex-1" />
                      <span className="footnote flex-none text-ink-muted tabular-nums">
                        {format.number(s.modules_done)}/{format.number(total)}
                      </span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="footnote text-center text-ink-muted">{t("count", { count: students.length })}</p>
    </div>
  );
}

function RemovedNote() {
  const t = useTranslations("teacher.roster");
  return (
    <p role="status" className="subhead rounded-md bg-surface-sunken p-3">
      {t("removed")}
    </p>
  );
}
