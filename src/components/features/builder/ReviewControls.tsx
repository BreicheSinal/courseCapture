"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import {
  deleteCourse,
  moveModule,
  renameCourse,
  type DeleteCourseState,
  type RenameState,
} from "@/lib/courses/actions";

/** T3 title with "Rename course": the title becomes a field and a Save button. */
export function RenameCourse({ courseId, title }: { courseId: string; title: string }) {
  const t = useTranslations("teacher.review");
  const te = useTranslations("teacher.courseErrors");
  const [editing, setEditing] = useState(false);
  const [state, action, saving] = useActionState<RenameState, FormData>(async (prev, fd) => {
    const r = await renameCourse(prev, fd);
    if (r?.saved) setEditing(false);
    return r;
  }, undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) headingRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  if (!editing)
    return (
      <div className="flex min-w-0 items-center gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="large-title min-w-0 break-words focus:outline-none" dir="auto">
          {title}
        </h1>
        <IconButton
          icon="pencil"
          label={t("rename")}
          size="xs"
          className="min-h-control min-w-control"
          onClick={() => setEditing(true)}
        />
      </div>
    );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="course" value={courseId} />
      <Field
        label={t("titleLabel")}
        name="title"
        defaultValue={title}
        maxLength={120}
        required
        autoFocus
        dir="auto"
        className="min-w-64 flex-1"
        error={state?.error ? te(state.error) : undefined}
      />
      <Button type="submit" variant="secondary" busy={saving}>
        {t("saveTitle")}
      </Button>
      <Button variant="ghost" onClick={() => setEditing(false)}>
        {t("cancel")}
      </Button>
    </form>
  );
}

/** T3 "More actions": Preview course, Delete course (confirms in place, design-system Menu). */
export function CourseMenu({ courseId, previewHref }: { courseId: string; previewHref: string }) {
  const t = useTranslations("teacher.review");
  const te = useTranslations("teacher.courseErrors");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const [state, action, deleting] = useActionState<DeleteCourseState, FormData>(deleteCourse, undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        list[(i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length]?.focus();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        list[e.key === "Home" ? 0 : list.length - 1]?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={wrap} className="cc-menu relative">
      <button
        ref={trigger}
        type="button"
        className="cc-iconbtn min-h-control min-w-control"
        aria-label={t("more")}
        title={t("more")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (setOpen(!open), setSure(false))}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div role="menu" aria-label={t("more")} className="cc-menu__panel cc-menu__panel--floating cc-menu__panel--end">
          <Link href={previewHref} role="menuitem" className="cc-menu__item min-h-control no-underline">
            <Icon name="eye" />
            {t("preview")}
          </Link>
          <div className="cc-menu__divider" role="separator" />
          <form action={action}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="course" value={courseId} />
            <button
              type={sure ? "submit" : "button"}
              role="menuitem"
              className="cc-menu__item cc-menu__item--danger min-h-control w-full"
              aria-busy={deleting || undefined}
              onClick={(e) => {
                if (!sure) {
                  e.preventDefault();
                  setSure(true);
                }
              }}
            >
              <Icon name="trash" />
              {deleting ? t("deleting") : sure ? t("deleteSure") : t("delete")}
            </button>
          </form>
          {state?.error && (
            <p className="footnote px-3 pb-2 text-danger" role="alert">
              {te("generic")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** T3 reorder: up/down IconButtons, announced in a live region. */
export function MoveButtons({
  moduleId,
  heading,
  first,
  last,
}: {
  moduleId: string;
  heading: string;
  first: boolean;
  last: boolean;
}) {
  const t = useTranslations("teacher.review");
  const te = useTranslations("teacher.courseErrors");
  const [pending, start] = useTransition();
  const [said, setSaid] = useState("");
  const move = (offset: 1 | -1) =>
    start(async () => {
      const ok = await moveModule(moduleId, offset);
      setSaid(ok ? t(offset < 0 ? "movedUp" : "movedDown", { heading }) : te("generic"));
    });
  return (
    <span className="flex flex-none gap-1">
      <IconButton
        icon="arrowUp"
        size="xs"
        className="min-h-control min-w-control"
        label={t("moveUp", { heading })}
        aria-disabled={first || pending || undefined}
        onClick={() => !first && !pending && move(-1)}
      />
      <IconButton
        icon="arrowDown"
        size="xs"
        className="min-h-control min-w-control"
        label={t("moveDown", { heading })}
        aria-disabled={last || pending || undefined}
        onClick={() => !last && !pending && move(1)}
      />
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </span>
  );
}
