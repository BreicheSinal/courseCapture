"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { completeModule } from "@/lib/student/actions";

/** "Complete & next" (S3 without a quiz, S4 after answering): records the module and moves on. */
export function CompleteButton({
  courseId,
  moduleId,
  next,
  last,
  disabled,
  hint,
}: {
  courseId: string;
  moduleId: string;
  next: number | null;
  last: boolean;
  disabled?: boolean;
  /** Says why the button is off (e.g. "Pick an answer first"). */
  hint?: string;
}) {
  const t = useTranslations("student.reader");
  const locale = useLocale();
  const [state, action, saving] = useActionState(completeModule, undefined);
  // aria-disabled keeps focus on the button while it's off or saving (WCAG 2.4.3).
  const off = !!disabled || saving;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (off) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="course" value={courseId} />
      <input type="hidden" name="module" value={moduleId} />
      {next !== null && <input type="hidden" name="next" value={next} />}
      <Button
        type="submit"
        variant="primary"
        block
        busy={saving}
        aria-disabled={off || undefined}
        aria-describedby={hint && disabled ? "complete-hint" : undefined}
      >
        {saving ? t("saving") : last ? t("completeFinish") : t("completeNext")}
      </Button>
      {hint && disabled && (
        <p id="complete-hint" className="footnote text-center text-ink-muted">
          {hint}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="footnote text-center text-danger">
          {state.error === "quizFirst" ? t("quizFirst") : t("saveFailed")}
        </p>
      )}
    </form>
  );
}
