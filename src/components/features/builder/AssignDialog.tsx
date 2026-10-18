"use client";

import { useActionState, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { saveAssignments, type AssignState } from "@/lib/courses/actions";
import type { TeacherClassOption } from "@/lib/courses/queries";

/**
 * T5 · Assign: pick one or more classes, each with its own optional due date
 * (decision #28). Unticking a class takes the course off it. Warns when some
 * modules haven't been checked yet.
 */
export function AssignDialog({
  course,
  classes,
  assigned,
  unchecked,
  today,
}: {
  course: { id: string; title: string; moduleCount: number };
  classes: TeacherClassOption[];
  assigned: Record<string, string | null>;
  unchecked: number;
  today: string;
}) {
  const t = useTranslations("teacher.assign");
  const tt = useTranslations("teacher");
  const te = useTranslations("teacher.courseErrors");
  const locale = useLocale();
  const router = useRouter();
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(Object.keys(assigned)));
  const [due, setDue] = useState<Record<string, string>>(() =>
    Object.fromEntries(classes.map((c) => [c.id, assigned[c.id] ?? ""])),
  );
  const [state, action, saving] = useActionState<AssignState, FormData>(saveAssignments, undefined);
  const close = useCallback(
    () => router.push(`/teacher/courses/${course.id}/review`, { scroll: false }),
    [router, course.id],
  );

  const label = (c: TeacherClassOption) =>
    c.section ? tt("classWithSection", { name: c.name, section: c.section }) : c.name;
  const was = Object.keys(assigned);
  const changed =
    ticked.size !== was.length ||
    was.some((id) => !ticked.has(id)) ||
    classes.some((c) => (assigned[c.id] ?? "") !== due[c.id] && ticked.has(c.id));
  const only = ticked.size === 1 ? classes.find((c) => ticked.has(c.id)) : null;
  const submitLabel =
    was.length > 0
      ? t("save")
      : only
        ? t("assignTo", { name: only.name })
        : ticked.size > 1
          ? t("assignToCount", { count: ticked.size })
          : t("assign");
  const failedClass = state?.className ? classes.find((c) => c.id === state.className) : null;

  return (
    <Dialog
      onClose={saving ? () => {} : close}
      title={t("title", { title: course.title })}
      description={t("subtitle", { count: course.moduleCount, unchecked })}
      className="cc-dialog--sticky"
    >
      {classes.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="body">{t("noClasses")}</p>
          <div className="cc-dialog__actions">
            <Button variant="secondary" onClick={close}>
              {t("cancel")}
            </Button>
            <Link href="/teacher/classes/new" className={buttonClasses({ variant: "primary" })}>
              {t("createClass")}
            </Link>
          </div>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="course" value={course.id} />
          {was.map((id) => (
            <input key={id} type="hidden" name="was" value={id} />
          ))}
          {unchecked > 0 && (
            <div className="cc-notice cc-notice--warning subhead">
              <Icon name="alert" />
              <p>
                <strong>{t("uncheckedTitle", { count: unchecked })}</strong>{" "}
                <span className="text-ink">{t("uncheckedText")}</span>
              </p>
            </div>
          )}
          <fieldset className="cc-group flex flex-col gap-2">
            <legend className="subhead mb-1 font-semibold">{t("classes")}</legend>
            {classes.map((c) => {
              const on = ticked.has(c.id);
              const dueId = `due-${c.id}`;
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-md border border-line p-3">
                  <label className="cc-check min-w-48 flex-1">
                    <input
                      type="checkbox"
                      className="cc-check__input"
                      name="class"
                      value={c.id}
                      checked={on}
                      onChange={(e) => {
                        const next = new Set(ticked);
                        if (e.currentTarget.checked) next.add(c.id);
                        else next.delete(c.id);
                        setTicked(next);
                      }}
                    />
                    <span className="cc-check__box" aria-hidden="true" />
                    <span className="cc-check__text">
                      <bdi>{label(c)}</bdi>
                      <span className="cc-check__hint">{t("students", { count: c.student_count })}</span>
                    </span>
                  </label>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={dueId} className="footnote font-semibold">
                      {t("due")}
                    </label>
                    <input
                      id={dueId}
                      type="date"
                      className="cc-input"
                      name={`due_${c.id}`}
                      value={due[c.id]}
                      min={assigned[c.id] && assigned[c.id]! < today ? assigned[c.id]! : today}
                      // Really disabled (not aria-disabled): an unticked class must not send a date.
                      disabled={!on}
                      onChange={(e) => setDue({ ...due, [c.id]: e.currentTarget.value })}
                      aria-describedby={`${dueId}-hint`}
                    />
                    <span id={`${dueId}-hint`} className="caption text-ink-muted">
                      {due[c.id] ? t("dueSet") : t("noDue")}
                    </span>
                  </div>
                </div>
              );
            })}
          </fieldset>
          {state?.error && (
            <p className="subhead text-danger" role="alert">
              {failedClass ? t("errorFor", { name: failedClass.name, reason: te(state.error) }) : te(state.error)}
            </p>
          )}
          <p className="footnote text-ink-muted">{t("help")}</p>
          <div className="cc-dialog__actions">
            <Button variant="secondary" onClick={close} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              busy={saving}
              aria-disabled={!changed || (ticked.size === 0 && was.length === 0) || undefined}
              onClick={(e) => {
                if (!changed || (ticked.size === 0 && was.length === 0)) e.preventDefault();
              }}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
