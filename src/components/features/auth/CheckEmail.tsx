"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { resendSignInLink, type AuthErrorKey } from "@/lib/auth/actions";
import { AuthHeading } from "./AuthScreen";

const COOLDOWN = 60; // seconds; matches Supabase's email rate limit (supabase/config.toml)

/** Webmail for common providers; other addresses get no "Open email app" button. */
function webmailFor(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "https://mail.google.com/";
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return "https://outlook.live.com/mail/";
  if (domain === "icloud.com" || domain === "me.com") return "https://www.icloud.com/mail/";
  if (/^(yahoo|ymail)\./.test(domain)) return "https://mail.yahoo.com/";
  return null;
}

/** Canvas T7b (teacher) / S0b (student) · Check your email, with a rate-limited resend. */
export function CheckEmail({ email, role }: { email: string; role: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [left, setLeft] = useState(COOLDOWN);
  const [sentAgain, setSentAgain] = useState(false);
  const [error, setError] = useState<AuthErrorKey | undefined>();
  const [pending, start] = useTransition();
  // Screen readers hear only events (sent again, error, can resend now), never the ticking countdown.
  const [announce, setAnnounce] = useState("");
  const format = useFormatter();
  const webmail = webmailFor(email);
  const mmss = (s: number) =>
    `${format.number(Math.floor(s / 60))}:${format.number(s % 60, { minimumIntegerDigits: 2 })}`;

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => {
      setLeft((s) => s - 1);
      if (left === 1) setAnnounce(t("checkEmail.canResend"));
    }, 1000);
    return () => clearTimeout(id);
  }, [left, t]);

  const resend = () =>
    start(async () => {
      const r = await resendSignInLink(email, role, locale);
      if (r?.error) {
        setError(r.error);
        setAnnounce(t(`errors.${r.error}`));
      } else {
        setError(undefined);
        setSentAgain(true);
        setLeft(COOLDOWN);
        setAnnounce(t("checkEmail.sentAgain", { time: mmss(COOLDOWN) }));
      }
    });

  const status = error
    ? t(`errors.${error}`)
    : left > 0
      ? t(sentAgain ? "checkEmail.sentAgain" : "checkEmail.resendIn", { time: mmss(left) })
      : t("checkEmail.canResend");

  return (
    <>
      <AuthHeading icon="mail" title={t("checkEmail.title")}>
        <p className="body text-ink-muted">{t("checkEmail.sentTo")}</p>
        <p className="body -mt-2 font-semibold break-all" dir="ltr">
          {email}
        </p>
        <p className="callout">{t("checkEmail.instructions")}</p>
      </AuthHeading>

      {webmail && (
        <a href={webmail} target="_blank" rel="noreferrer" className="cc-btn cc-btn--primary cc-btn--block no-underline">
          {t("checkEmail.openApp")}
        </a>
      )}

      <Card className="flex flex-col gap-2 p-4">
        <h2 className="callout font-semibold">{t("checkEmail.didntGet")}</h2>
        <p className="subhead text-ink-muted">{t("checkEmail.spamHint")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" busy={pending} disabled={left > 0 || pending} onClick={resend}>
            {!pending && <Icon name="resend" />}
            {t("checkEmail.resend")}
          </Button>
          <span
            aria-hidden="true"
            className={
              error ? "footnote font-semibold text-danger" : sentAgain && left > 0 ? "footnote font-semibold text-success" : "footnote text-ink-muted"
            }
          >
            {status}
          </span>
          <span role="status" className="sr-only">
            {announce}
          </span>
        </div>
      </Card>

      <Link href="/sign-in" className="cc-btn cc-btn--ghost self-center no-underline">
        {t("checkEmail.differentEmail")}
      </Link>
    </>
  );
}
