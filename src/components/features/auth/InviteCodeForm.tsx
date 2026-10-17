"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { checkInvite, redeemInvite, type InviteState } from "@/lib/auth/actions";
import { formatInviteCode } from "@/lib/auth/invite-code";
import { AuthHeading } from "./AuthScreen";

/** Canvas T7e · Invite code: check the code, see the school, then join. */
export function InviteCodeForm({ initialError }: { initialError?: "codeNotFound" }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action, checking] = useActionState<InviteState, FormData>(checkInvite, {
    step: "enter",
    error: initialError,
  });
  const confirmed = state.step === "confirm";

  return (
    <>
      <AuthHeading icon="key" title={t("invite.title")}>
        <p className="body text-ink-muted">{t("invite.intro")}</p>
      </AuthHeading>

      <Card as="section" className="flex flex-col gap-4">
        <form action={action} className="flex flex-col gap-4">
          <Field
            label={t("invite.label")}
            name="code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            placeholder={t("invite.placeholder")}
            size="lg"
            dir="ltr"
            inputClassName="join-code text-center"
            key={confirmed ? "ok" : "enter"}
            defaultValue={confirmed ? formatInviteCode(state.code) : state.code}
            readOnly={confirmed}
            hint={confirmed ? <span className="font-semibold text-success">{t("invite.accepted")}</span> : t("invite.help")}
            error={state.step === "enter" && state.error ? t(`errors.${state.error}`) : undefined}
          />
          {!confirmed && (
            <Button type="submit" variant="primary" block busy={checking}>
              {checking ? t("invite.checking") : t("invite.check")}
            </Button>
          )}
        </form>

        {confirmed && (
          <form action={redeemInvite} className="flex flex-col gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="code" value={state.code} />
            <div className="flex items-center gap-3 rounded-md bg-surface-sunken p-3">
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-sm bg-surface text-accent-text">
                <Icon name="school" width={20} height={20} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="callout font-semibold">{state.school}</span>
                <span className="footnote text-ink">{t("invite.invitedBy", { name: state.invitedBy })}</span>
              </div>
            </div>
            <Button type="submit" variant="primary" block>
              {t("invite.join", { school: state.school })}
            </Button>
          </form>
        )}
      </Card>

      <p className="footnote mt-auto text-center text-ink-muted">
        {t("invite.noCode")}{" "}
        <Link href="/onboarding/pending" className="font-semibold no-underline">
          {t("invite.backToApproval")}
        </Link>
      </p>
    </>
  );
}
