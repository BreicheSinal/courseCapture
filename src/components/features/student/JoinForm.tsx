"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { joinClass } from "@/lib/student/actions";

/** Canvas S1 · Join a class: the five-character code from the teacher. */
export function JoinForm({ firstName, hasClasses }: { firstName: string; hasClasses: boolean }) {
  const t = useTranslations("student.join");
  const locale = useLocale();
  const [state, action, joining] = useActionState(joinClass, undefined);
  const error = state?.error;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 pt-8 lg:pt-16">
      <div className="flex flex-col gap-2">
        {!hasClasses && firstName && <p className="eyebrow text-accent-text">{t("hi", { name: firstName })}</p>}
        <h1 className="large-title">{t("title")}</h1>
        <p className="body text-ink-muted">{t("text")}</p>
      </div>

      <form action={action} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <div className={error ? "cc-field is-error" : "cc-field"}>
          <label htmlFor="code" className="cc-field__label">
            {t("code")}
          </label>
          <input
            id="code"
            name="code"
            defaultValue={state?.code ?? ""}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={7}
            dir="ltr"
            required
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "code-error" : "code-hint"}
            className="cc-input cc-input--lg join-code text-center uppercase"
          />
          {error ? (
            <p id="code-error" role="alert" className="cc-field__error flex gap-2">
              <Icon name="alert" width={16} height={16} className="mt-1 flex-none" />
              <span>
                <strong>{t(`errors.${error}.title`)}</strong>{" "}
                <span className="text-ink">{t(`errors.${error}.text`)}</span>
              </span>
            </p>
          ) : (
            <span id="code-hint" className="cc-field__hint">
              {t("hint")}
            </span>
          )}
        </div>
        <Button type="submit" variant="primary" block busy={joining}>
          {joining ? t("joining") : t("join")}
        </Button>
      </form>

      <Card className="mt-auto flex gap-3">
        <Icon name="lock" width={20} height={20} className="flex-none text-ink-muted" />
        <p className="subhead text-ink-muted">{t("privacy")}</p>
      </Card>
    </div>
  );
}
