"use client";

import { useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { checkApproval, signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";
import { AuthHeading } from "./AuthScreen";

/** Canvas T7d · Pending approval. "Check again" moves on as soon as an admin approves. */
export function PendingApproval({ name, email, rejected }: { name: string; email: string; rejected: boolean }) {
  const t = useTranslations("auth.pending");
  const format = useFormatter();
  const locale = useLocale();
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [pending, start] = useTransition();

  const check = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("locale", locale);
      await checkApproval(fd); // redirects when approved
      setCheckedAt(new Date());
    });

  const steps = [
    { label: t("stepEmail"), state: "done" as const },
    { label: t("stepApprove"), state: rejected ? ("rejected" as const) : ("current" as const) },
    { label: t("stepClass"), state: "todo" as const },
  ];

  return (
    <>
      <AuthHeading
        icon="clock"
        eyebrow={t("eyebrow")}
        title={rejected ? t("rejectedTitle") : t("title")}
        tone={rejected ? "warning" : "accent"}
      >
        <p className="body text-ink-muted">
          {rejected
            ? t("rejectedBody")
            : t.rich("body", {
                name,
                email,
                strong: (chunks) => <strong className="text-ink">{chunks}</strong>,
              })}
        </p>
      </AuthHeading>

      <Card as="section" className="px-4 py-1">
        <ol aria-label={t("steps")} className="m-0 list-none p-0">
          {steps.map((s, i) => (
            <li
              key={s.label}
              aria-current={s.state === "current" ? "step" : undefined}
              className={cn("flex min-h-14 items-center gap-3", i < steps.length - 1 && "border-b border-line")}
            >
              {s.state === "done" ? (
                <Icon name="checkCircle" width={22} height={22} className="text-success" />
              ) : s.state === "current" ? (
                <span aria-hidden="true" className="grid size-6 place-items-center rounded-pill border-2 border-accent">
                  <span className="size-2 rounded-pill bg-accent" />
                </span>
              ) : s.state === "rejected" ? (
                <Icon name="alert" width={22} height={22} className="text-warning" />
              ) : (
                <span aria-hidden="true" className="size-6 rounded-pill border-2 border-line-strong" />
              )}
              <span
                className={cn(
                  "callout flex-1",
                  s.state === "current" && "font-semibold",
                  s.state === "todo" && "text-ink-muted",
                )}
              >
                {s.label}
              </span>
              {s.state === "done" && <span className="footnote font-semibold text-success">{t("done")}</span>}
              {s.state === "current" && <span className="footnote font-semibold text-accent-text">{t("waiting")}</span>}
              {s.state === "rejected" && <span className="footnote font-semibold text-warning">{t("notApproved")}</span>}
            </li>
          ))}
        </ol>
      </Card>

      {!rejected && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" block busy={pending} onClick={check}>
            {!pending && <Icon name="resend" />}
            {pending ? t("checking") : t("checkAgain")}
          </Button>
          <p role="status" className="footnote min-h-5 text-center text-ink-muted">
            {checkedAt && t("checkedAt", { time: format.dateTime(checkedAt, { hour: "numeric", minute: "2-digit" }) })}
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-col items-center gap-1">
        <Link href="/onboarding/invite" className="cc-btn cc-btn--ghost no-underline">
          {t("haveCode")}
        </Link>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="cc-btn cc-btn--ghost text-ink">
            {t("signOut")}
          </button>
        </form>
      </div>
    </>
  );
}
