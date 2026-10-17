"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { sendSignInLink, type AuthErrorKey } from "@/lib/auth/actions";

type Role = "teacher" | "student";

/** Canvas T7 · Sign in: pick teacher or student, then get a sign-in link by email. */
export function SignInForm({
  initialError,
  configured,
}: {
  initialError?: AuthErrorKey | "linkExpired";
  configured: boolean;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [role, setRole] = useState<Role>("teacher");
  const [state, action, pending] = useActionState(sendSignInLink, undefined);
  const error = state?.error ?? initialError;

  return (
    <>
      <div className="flex flex-col items-center gap-4 pt-12 text-center">
        <p className="cc-wordmark cc-wordmark--lg" dir="ltr">
          Course<span>Capture</span>
        </p>
        <p className="body text-ink-muted">{t("signIn.tagline")}</p>
      </div>

      <Card as="section" aria-labelledby="sign-in-title" className="flex flex-col gap-4">
        <h1 id="sign-in-title" className="title">
          {t("signIn.title")}
        </h1>

        {!configured && (
          <p role="status" className="subhead rounded-md bg-accent-soft p-3 text-accent-text">
            {t("signIn.notConfigured")}
          </p>
        )}

        <form action={action} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="locale" value={locale} />
          <Segmented
            name="role"
            legend={t("signIn.roleLabel")}
            size="lg"
            block
            value={role}
            onChange={setRole}
            options={[
              { value: "teacher", label: t("signIn.teacher") },
              { value: "student", label: t("signIn.student") },
            ]}
          />
          <Field
            label={role === "teacher" ? t("signIn.emailTeacher") : t("signIn.emailStudent")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t("signIn.emailPlaceholder")}
            required
            dir="ltr"
            error={error ? t(`errors.${error}`) : undefined}
          />
          <Button type="submit" variant="primary" block busy={pending} disabled={!configured}>
            {pending ? t("signIn.sending") : t("signIn.submit")}
          </Button>
        </form>

      </Card>

      <p className="footnote mt-auto text-center text-ink-muted">
        {role === "teacher" ? t("signIn.footTeacher") : t("signIn.footStudent")}
      </p>
    </>
  );
}
