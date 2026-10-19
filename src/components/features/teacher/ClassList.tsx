"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { ClassSummary } from "@/types/supabase";
import { PageHeader } from "./PageHeader";

/** Canvas T10 · Class list: search, create, and one card per class with its code and status. */
export function ClassList({ classes, notice }: { classes: ClassSummary[]; notice?: "deleted" }) {
  const t = useTranslations("teacher.classList");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  // After deleting a class the dialog is gone: put focus on the page heading.
  useEffect(() => {
    if (notice === "deleted") document.getElementById("page-title")?.focus();
  }, [notice]);
  const q = query.trim().toLocaleLowerCase();
  const shown = q
    ? classes.filter((c) => `${c.name} ${c.section} ${c.join_code}`.toLocaleLowerCase().includes(q))
    : classes;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")} size="large" />
      {notice === "deleted" && (
        <p role="status" className="subhead rounded-md bg-surface-sunken p-3">
          {t("deleted")}
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="cc-search flex-1" role="search">
          <div className="cc-inputbox">
            {/* The icon and field share a label, so a tap anywhere in the 44px box reaches the field (decision #74). */}
            <label className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
              <span className="cc-inputbox__affix" aria-hidden="true">
                <Icon name="search" />
              </span>
              <input
                ref={inputRef}
                className="cc-input"
                type="search"
                aria-label={t("search")}
                placeholder={t("search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && clear()}
              />
            </label>
            {query && (
              <button
                type="button"
                className="cc-search__btn min-h-control min-w-control"
                aria-label={t("clearSearch")}
                onClick={clear}
              >
                <Icon name="close" />
              </button>
            )}
          </div>
        </div>
        <Link href="/teacher/classes/new" className={buttonClasses({ variant: "primary" })}>
          {t("create")}
        </Link>
      </div>
      <p className="sr-only" aria-live="polite">
        {q ? t("results", { count: shown.length }) : ""}
      </p>

      {shown.length === 0 ? (
        <EmptyState icon="search" title={t("noMatch", { query: query.trim() })} text={t("noMatchText")} />
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/teacher/classes/${c.id}`} className="cc-card cc-course h-full">
                <span className="cc-course__top items-center">
                  <span className="headline min-w-0 truncate">
                    <bdi>{c.name}</bdi>
                  </span>
                  <span className="code flex-none rounded-sm bg-accent-soft px-2 font-bold text-accent-text" dir="ltr">
                    {c.join_code}
                  </span>
                </span>
                <span className="subhead text-ink-muted">
                  {[c.section, t("students", { count: c.student_count }), t("courses", { count: c.course_count })]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <ClassStatus summary={c} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One status line, always with words (never colour only). */
function ClassStatus({ summary: c }: { summary: ClassSummary }) {
  const t = useTranslations("teacher.classList");
  if (c.student_count === 0)
    return <span className="footnote font-semibold text-ink-muted">{t("statusNoStudents")}</span>;
  if (c.course_count === 0)
    return <span className="footnote font-semibold text-ink-muted">{t("statusNoCourses")}</span>;
  if (c.overdue_students > 0)
    return (
      <span className="footnote flex items-center gap-1 font-semibold text-warning">
        <Icon name="alert" width={14} height={14} />
        {t("statusOverdue", { count: c.overdue_students })}
      </span>
    );
  return (
    <span className="footnote flex items-center gap-1 font-semibold text-success">
      <Icon name="check" width={14} height={14} />
      {t("statusOnTrack")}
    </span>
  );
}
