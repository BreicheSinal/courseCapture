"use client";

import { useActionState, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { createInvite, revokeInvite } from "@/lib/auth/admin-actions";
import { formatInviteCode } from "@/lib/auth/invite-code";
import type { TeacherInviteRow } from "@/types/supabase";

type Invite = Pick<TeacherInviteRow, "code" | "school_name" | "max_uses" | "uses" | "expires_at" | "revoked_at">;

function statusOf(i: Invite, now: number): "active" | "expired" | "revoked" | "usedUp" {
  if (i.revoked_at) return "revoked";
  if (i.uses >= i.max_uses) return "usedUp";
  if (new Date(i.expires_at).getTime() <= now) return "expired";
  return "active";
}

/** Admin · Invite codes: create codes that let a teacher skip approval, and revoke them. */
export function InviteCodes({ invites, now }: { invites: Invite[]; now: number }) {
  const t = useTranslations("admin.invites");
  const format = useFormatter();
  const [state, action, creating] = useActionState(createInvite, undefined);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const copy = async (code: string) => {
    await navigator.clipboard?.writeText(formatInviteCode(code)).catch(() => {});
    setCopied(code);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="large-title">{t("title")}</h1>

      <Card as="section" aria-labelledby="new-invite" className="flex flex-col gap-4">
        <h2 id="new-invite" className="headline">
          {t("createTitle")}
        </h2>
        <form action={action} className="flex flex-col gap-4">
          <Field
            label={t("school")}
            name="school_name"
            required
            maxLength={120}
            placeholder={t("schoolPlaceholder")}
            error={state?.error ? t(state.error) : undefined}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("uses")} name="max_uses" type="number" min={1} max={500} defaultValue={1} inputMode="numeric" />
            <Field label={t("expiresIn")} name="expires_in_days" type="number" min={1} max={90} defaultValue={7} inputMode="numeric" />
          </div>
          <Button type="submit" variant="primary" busy={creating} className="self-start">
            {creating ? t("creating") : t("create")}
          </Button>
        </form>
        {state?.createdCode && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-md bg-accent-soft p-3">
            <span className="join-code text-accent-text" dir="ltr">
              {formatInviteCode(state.createdCode)}
            </span>
            <IconButton icon="copy" label={t("copy")} onClick={() => copy(state.createdCode!)} />
            <span className="subhead flex-1 text-accent-text">
              {copied === state.createdCode ? t("copied") : t("created")}
            </span>
          </div>
        )}
      </Card>

      <Card as="section" aria-labelledby="codes" className="flex flex-col gap-2">
        <h2 id="codes" className="headline">
          {t("listTitle")}
        </h2>
        {invites.length === 0 ? (
          <EmptyState icon="key" inline title={t("emptyTitle")} text={t("emptyText")} />
        ) : (
          <ul className="m-0 list-none p-0">
            {invites.map((i) => {
              const status = statusOf(i, now);
              return (
                <li key={i.code} className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="code font-semibold" dir="ltr">
                      {formatInviteCode(i.code)}
                    </span>
                    <span className="subhead truncate">{i.school_name}</span>
                    <span className="caption text-ink-muted">
                      {t("usesOf", { uses: i.uses, max: i.max_uses })} ·{" "}
                      {t("expires", { date: format.dateTime(new Date(i.expires_at), { month: "short", day: "numeric" }) })}
                    </span>
                  </div>
                  <Badge
                    size="sm"
                    variant={status === "active" ? "success" : status === "revoked" ? "danger" : "neutral"}
                  >
                    {t(
                      status === "active"
                        ? "statusActive"
                        : status === "expired"
                          ? "statusExpired"
                          : status === "revoked"
                            ? "statusRevoked"
                            : "statusUsedUp",
                    )}
                  </Badge>
                  {status === "active" && (
                    <>
                      <IconButton icon="copy" size="xs" label={t("copy")} onClick={() => copy(i.code)} />
                      <form
                        action={revokeInvite}
                        onSubmit={(e) => {
                          if (confirm !== i.code) {
                            e.preventDefault();
                            setConfirm(i.code);
                          }
                        }}
                      >
                        <input type="hidden" name="code" value={i.code} />
                        <Button
                          type="submit"
                          variant="danger"
                          size="sm"
                          data-confirm={confirm === i.code || undefined}
                        >
                          {confirm === i.code ? t("sure") : t("revoke")}
                        </Button>
                      </form>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
