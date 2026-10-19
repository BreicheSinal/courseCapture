"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { isServiceConfigured, serviceClient } from "@/lib/supabase/service";

/**
 * `/contact` (#59): emails the message to the site's contact address
 * (CONTACT_EMAIL, else the SMTP sender). Nothing about the message is stored;
 * the rate limit keeps only an HMAC of the sender's IP (key CONTACT_SALT) and the time.
 * It runs for anonymous visitors, so it calls exactly one service-role function,
 * `claim_contact_slot`, with a fixed-length hash (decision #84).
 */
export type ContactField = "name" | "school" | "email" | "message";
export type ContactState =
  | { sent: true; email: string }
  | { sent?: false; error?: "tooMany" | "failed"; fields?: Partial<Record<ContactField, true>>; values?: Record<ContactField, string> }
  | undefined;

const LIMIT = 5; // messages per sender per hour

const isProd = process.env.NODE_ENV === "production";
const oneLine = /^[^\p{Cc}]*$/u; // no line breaks or control characters (they go into the subject and header lines)

const schema = z.object({
  name: z.string().trim().min(1).max(100).regex(oneLine),
  school: z.string().trim().min(1).max(150).regex(oneLine),
  email: z.string().trim().max(254).email(),
  message: z.string().trim().min(20).max(4000),
});

/**
 * The sender's IP as the platform saw it. On Vercel, x-vercel-forwarded-for and
 * x-forwarded-for are set by the edge, not the client. IPv6 visitors usually hold a
 * whole /64, so they count as one sender.
 */
async function senderIp(): Promise<string | null> {
  const h = await headers();
  const raw = (h.get("x-vercel-forwarded-for") || h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim();
  if (!raw) return isProd ? null : "local";
  if (raw.includes(":")) return raw.split(":").slice(0, 4).join(":") + "::/64";
  return raw;
}

/** HMAC of the IP: without CONTACT_SALT the stored value can't be turned back into an address. */
function senderKey(ip: string, salt: string) {
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    school: String(formData.get("school") ?? ""),
    email: String(formData.get("email") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], true])) as Partial<Record<ContactField, true>>;
    return { fields, values: raw };
  }
  const data = parsed.data;

  // Honeypot: people never see this field; bots fill it. Look successful, send nothing.
  if (String(formData.get("cc_hp") ?? "").trim()) {
    console.info("[contact] honeypot submission dropped");
    return { sent: true, email: data.email };
  }

  // Rate limit. In production it must work, or nothing is sent (fail closed).
  const salt = process.env.CONTACT_SALT || (isProd ? "" : "dev-only-contact-salt");
  const ip = await senderIp();
  if (isServiceConfigured() && salt && ip) {
    const { data: ok, error } = await serviceClient().rpc("claim_contact_slot", {
      p_sender: senderKey(ip, salt),
      p_limit: LIMIT,
      p_window: "1 hour",
    });
    if (error) {
      console.error("[contact] rate limit check failed:", error.message);
      return { error: "failed", values: raw };
    }
    if (!ok) return { error: "tooMany", values: raw };
  } else if (isProd) {
    console.error("[contact] rate limit unavailable (needs SUPABASE_SERVICE_ROLE_KEY, CONTACT_SALT and a client IP); not sent");
    return { error: "failed", values: raw };
  }

  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  if (!to) {
    console.warn("[contact] CONTACT_EMAIL and SMTP_USER aren't set; message not sent");
    return { error: "failed", values: raw };
  }
  const lines = [`Name: ${data.name}`, `School: ${data.school}`, `Email: ${data.email}`, "", data.message];
  const sent = await sendEmail({
    to,
    replyTo: data.email,
    subject: `CourseCapture contact: ${data.school}`.slice(0, 160),
    text: lines.join("\n"),
    html: `<p><strong>Name:</strong> ${escapeHtml(data.name)}<br><strong>School:</strong> ${escapeHtml(data.school)}<br><strong>Email:</strong> ${escapeHtml(data.email)}</p><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`,
  });
  return sent ? { sent: true, email: data.email } : { error: "failed", values: raw };
}
