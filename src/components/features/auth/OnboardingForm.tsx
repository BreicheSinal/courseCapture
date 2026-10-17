"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { completeOnboarding } from "@/lib/auth/actions";
import { AuthHeading } from "./AuthScreen";

/**
 * First sign-in: ask for a name (email sign-in doesn't give one) and, if the
 * role wasn't picked at sign-in, teacher or student. Not a canvas screen;
 * built from the same parts as T7.
 */
export function OnboardingForm({
  defaultName,
  needsRole,
  suggestedRole,
}: {
  defaultName: string;
  needsRole: boolean;
  suggestedRole?: "teacher" | "student";
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [role, setRole] = useState<"teacher" | "student">(suggestedRole ?? "teacher");

  return (
    <>
      <AuthHeading icon="person" title={t("onboarding.title")}>
        <p className="body text-ink-muted">{t("onboarding.intro")}</p>
      </AuthHeading>
      <Card as="section">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          {needsRole && (
            <Segmented
              name="role"
              legend={t("onboarding.roleLabel")}
              size="lg"
              block
              value={role}
              onChange={setRole}
              options={[
                { value: "teacher", label: t("signIn.teacher") },
                { value: "student", label: t("signIn.student") },
              ]}
            />
          )}
          <Field
            label={t("onboarding.nameLabel")}
            name="full_name"
            autoComplete="name"
            maxLength={80}
            required
            defaultValue={defaultName}
            placeholder={t("onboarding.namePlaceholder")}
            error={state?.error ? t(`errors.${state.error}`) : undefined}
          />
          <Button type="submit" variant="primary" block busy={pending}>
            {pending ? t("onboarding.saving") : t("onboarding.continue")}
          </Button>
        </form>
      </Card>
    </>
  );
}
