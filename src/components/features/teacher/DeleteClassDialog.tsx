"use client";

import { useActionState, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { deleteClass } from "@/lib/classes/actions";
import { isolate } from "./rich";

/** Canvas T15 · Delete class: type the class name to confirm (design-system DestructiveActionModal). */
export function DeleteClassDialog({
  cls,
}: {
  cls: { id: string; name: string; section: string; student_count: number; course_count: number };
}) {
  const t = useTranslations("teacher");
  const locale = useLocale();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [state, action, deleting] = useActionState(deleteClass, undefined);
  const matches = typed.trim() === cls.name.trim();
  const close = useCallback(() => router.push(`/teacher/classes/${cls.id}`, { scroll: false }), [router, cls.id]);
  const label = cls.section ? t("classWithSection", { name: cls.name, section: cls.section }) : cls.name;

  return (
    <Dialog
      role="alertdialog"
      // Stays open while deleting (design-system rule).
      onClose={deleting ? () => {} : close}
      title={t.rich("deleteClass.title", { ...isolate, name: label })}
      description={t("deleteClass.body", { students: cls.student_count, courses: cls.course_count })}
    >
      <div className="cc-dialog__note">
        <Icon name="alert" />
        <span>{t("deleteClass.cantUndo")}</span>
      </div>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={cls.id} />
        <Field
          label={t.rich("deleteClass.typeToConfirm", { ...isolate, name: cls.name })}
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          data-autofocus
          hint={matches ? t("deleteClass.matches") : t("deleteClass.doesntMatch")}
          error={state?.error ? t(state.error === "nameMismatch" ? "deleteClass.mismatch" : "deleteClass.failed") : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !matches) e.preventDefault();
          }}
        />
        <div className="cc-dialog__actions">
          <Button variant="secondary" onClick={close} disabled={deleting}>
            {t("deleteClass.cancel")}
          </Button>
          <Button type="submit" variant="danger" disabled={!matches || deleting} busy={deleting}>
            {deleting ? t("deleteClass.deleting") : t("deleteClass.confirm")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
