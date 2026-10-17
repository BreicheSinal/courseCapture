import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends email through the SMTP account in SMTP_* (Google SMTP for the support
 * address; docs/setup-supabase.md). Returns false instead of throwing so a mail
 * problem never blocks the action that triggered it.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[email] SMTP isn't configured; skipped:", msg.subject);
    return false;
  }
  const port = Number(SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  try {
    await transport.sendMail({ from: EMAIL_FROM || SMTP_USER, ...msg });
    return true;
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Escapes text for the HTML part. */
export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
