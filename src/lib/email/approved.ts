import "server-only";
import { getTranslations } from "next-intl/server";
import { locales, defaultLocale, type Locale } from "@/i18n/locales";
import { appUrl } from "@/lib/supabase/env";
import { escapeHtml, sendEmail } from "./send";

/** "You're approved" email to a teacher, in their interface language (issue #14). */
export async function sendApprovedEmail(teacher: { email: string; full_name: string; ui_locale: string | null }) {
  const locale: Locale = (locales as readonly string[]).includes(teacher.ui_locale ?? "")
    ? (teacher.ui_locale as Locale)
    : defaultLocale;
  const t = await getTranslations({ locale, namespace: "emails.approved" });
  const name = teacher.full_name.trim() || teacher.email;
  const url = `${appUrl}/${locale}/teacher`;
  const dir = locale === "ar" ? "rtl" : "ltr";

  const lines = [t("greeting", { name }), t("body"), t("cta")];
  return sendEmail({
    to: teacher.email,
    subject: t("subject"),
    text: `${lines.join("\n\n")}\n${url}\n\n— CourseCapture`,
    html: `<div dir="${dir}" lang="${locale}">
<p>${escapeHtml(lines[0])}</p>
<p>${escapeHtml(lines[1])}</p>
<p><a href="${escapeHtml(url)}">${escapeHtml(t("cta"))}</a></p>
<p>— CourseCapture</p>
</div>`,
  });
}
