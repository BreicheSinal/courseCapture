"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { buttonClasses, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { createClass, updateClass, type ClassFormState } from "@/lib/classes/actions";
import type { ClassRow } from "@/types/supabase";
import { JoinCodeBar } from "./JoinCodeBar";
import { PageHeader } from "./PageHeader";

type Editable = Pick<ClassRow, "id" | "name" | "section" | "join_code">;

/**
 * T9 · Create class: name and optional section, then "Class created" with the
 * join code. "Edit class name" goes back to the form, now saving changes.
 * With `existing`, it's the class page's edit form.
 */
export function ClassForm({ existing }: { existing?: Editable }) {
  const t = useTranslations("teacher.classForm");
  const router = useRouter();
  const [created, setCreated] = useState<Editable | null>(null);
  const [editing, setEditing] = useState(false);
  const cls = existing ?? created;
  const readyRef = useRef<HTMLHeadingElement>(null);

  const [state, action, pending] = useActionState<ClassFormState, FormData>(async (prev, formData) => {
    const result = await (cls ? updateClass : createClass)(prev, formData);
    if (result?.saved) {
      if (existing) router.push(`/teacher/classes/${existing.id}`);
      else setCreated(result.saved);
      setEditing(false);
    }
    return result;
  }, undefined);

  const showDone = !existing && created && !editing;

  // The form (and its submit button) is replaced by the result: move focus to its heading.
  useEffect(() => {
    if (showDone) readyRef.current?.focus();
  }, [showDone]);
  const backHref = existing ? `/teacher/classes/${existing.id}` : "/teacher/classes";

  if (showDone) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <PageHeader title={t("newTitle")} back={{ href: "/teacher/classes", label: t("backToClasses") }} />
        <Card as="section" aria-labelledby="class-ready" className="flex flex-col items-center gap-2 text-center">
          <span role="status" className="subhead flex items-center gap-1 font-semibold text-success">
            <Icon name="check" width={16} height={16} />
            {t("created")}
          </span>
          <h2 id="class-ready" ref={readyRef} tabIndex={-1} className="large-title focus:outline-none">
            <bdi>{created.name}</bdi>
          </h2>
          <span className="subhead text-ink-muted">
            {created.section ? t("sectionNoStudents", { section: created.section }) : t("noStudents")}
          </span>
          <JoinCodeBar
            classId={created.id}
            code={created.join_code}
            size="lg"
            onChange={(join_code) => setCreated({ ...created, join_code })}
          />
          <p className="footnote mt-1 text-ink-muted">{t("codeHelp")}</p>
        </Card>
        <Button variant="ghost" className="self-center" onClick={() => setEditing(true)}>
          {t("editName")}
        </Button>
        <div className="flex flex-col gap-2">
          <Link href={`/teacher/courses/new?class=${created.id}`} className={buttonClasses({ variant: "primary", block: true })}>
            {t("firstCourse")}
          </Link>
          <Link href={`/teacher/classes/${created.id}`} className={buttonClasses({ variant: "secondary", block: true })}>
            {t("goTo", { name: created.name })}
          </Link>
        </div>
      </div>
    );
  }

  const fieldError = (field: "name" | "section") =>
    state?.error && state.field === field ? t(`errors.${state.error}`) : undefined;

  return (
    <div className={existing ? "flex max-w-xl flex-col gap-5" : "mx-auto flex max-w-xl flex-col gap-5"}>
      {existing ? (
        // Inside the class page (header and tabs above): a titled card, not a new page header.
        <h2 className="headline">{t("editTitle")}</h2>
      ) : (
        <PageHeader title={t("newTitle")} back={{ href: backHref, label: t("backToClasses") }} />
      )}
      <form action={action} className={existing ? "cc-card flex flex-col gap-5" : "flex flex-col gap-5"} noValidate>
        {cls && <input type="hidden" name="id" value={cls.id} />}
        <Field
          label={t("name")}
          name="name"
          required
          maxLength={60}
          defaultValue={cls?.name ?? ""}
          placeholder={t("namePlaceholder")}
          autoComplete="off"
          error={fieldError("name")}
          autoFocus
        />
        <Field
          label={t("section")}
          name="section"
          maxLength={40}
          defaultValue={cls?.section ?? ""}
          placeholder={t("sectionPlaceholder")}
          hint={t("sectionHint")}
          autoComplete="off"
          error={fieldError("section")}
        />
        {state?.error === "generic" && (
          <p role="alert" className="footnote text-danger">
            {t("errors.generic")}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {existing && (
            <Link href={backHref} className={buttonClasses({ variant: "secondary" })}>
              {t("cancel")}
            </Link>
          )}
          <Button type="submit" variant="primary" block={!existing} busy={pending}>
            {pending ? t("saving") : cls ? t("save") : t("create")}
          </Button>
        </div>
      </form>
    </div>
  );
}
