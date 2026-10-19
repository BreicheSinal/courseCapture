"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { isServiceConfigured, serviceClient } from "@/lib/supabase/service";

/**
 * `/contact` (#59): emails the message to the site's contact address
 * (CONTACT_EMAIL, else the SMTP sender). Nothing about the message is stored;
 * the rate limit keeps only a salted hash of the sender's IP and the time.
 */
export type ContactField = "name" | "school" | "email" | "message";
export type ContactState =
  | { sent: true; email: string }
  | { sent?: false; error?: "tooMany" | "failed"; fields?: Partial<Record<ContactField, true>>; values?: Record<ContactField, string> }
  | undefined;

const LIMIT = 5; // messages per sender per hour

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  school: z.string().trim().min(1).max(150),
  email: z.string().trim().max(254).email(),
  message: z.string().trim().min(20).max(4000),
});

async function senderKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.CONTACT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "coursecapture";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
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
  if (String(formData.get("website") ?? "").trim()) return { sent: true, email: data.email };

  if (isServiceConfigured()) {
    const { data: ok, error } = await serviceClient().rpc("claim_contact_slot", {
      p_sender: await senderKey(),
      p_limit: LIMIT,
      p_window: "1 hour",
    });
    if (error) {
      console.error("[contact] rate limit check failed:", error.message);
      return { error: "failed", values: raw };
    }
    if (!ok) return { error: "tooMany", values: raw };
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
