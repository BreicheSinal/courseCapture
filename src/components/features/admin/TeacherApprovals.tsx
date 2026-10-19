import { useFormatter, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApprovalActions } from "./ApprovalActions";
import type { ProfileRow } from "@/types/supabase";

type Teacher = Pick<ProfileRow, "id" | "full_name" | "email" | "status" | "created_at" | "approved_via_invite">;

/** Admin · Teachers: approve or reject pending teacher accounts (no canvas screen; built from system parts). */
export function TeacherApprovals({ pending, decided }: { pending: Teacher[]; decided: Teacher[] }) {
  const t = useTranslations("admin.teachers");
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { month: "short", day: "numeric" });

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="large-title">{t("title")}</h1>

      <Card as="section" aria-labelledby="pending-title" className="flex flex-col gap-2">
        <h2 id="pending-title" className="headline">
          {t("pendingTitle")}
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon="classes" inline title={t("emptyTitle")} text={t("emptyText")} />
        ) : (
          <ul className="m-0 list-none p-0">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
                <Avatar name={p.full_name || p.email} tone="soft" />
                <div className="flex min-w-0 flex-1 basis-48 flex-col">
                  <span className="callout truncate font-semibold">{p.full_name || p.email}</span>
                  <span className="footnote truncate text-ink-muted" dir="ltr">
                    {p.email}
                  </span>
                  <span className="caption text-ink-muted">{t("signedUp", { date: date(p.created_at) })}</span>
                </div>
                <ApprovalActions id={p.id} name={p.full_name || p.email} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {decided.length > 0 && (
        <Card as="section" aria-labelledby="decided-title" className="flex flex-col gap-2">
          <h2 id="decided-title" className="headline">
            {t("decidedTitle")}
          </h2>
          <ul className="m-0 list-none p-0">
            {decided.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
                <Avatar name={p.full_name || p.email} tone="soft" />
                <div className="flex min-w-0 flex-1 basis-48 flex-col">
                  <span className="callout truncate">{p.full_name || p.email}</span>
                  <span className="footnote truncate text-ink-muted" dir="ltr">
                    {p.email}
                  </span>
                </div>
                {p.approved_via_invite && <Badge variant="neutral">{t("viaInvite")}</Badge>}
                <Badge variant={p.status === "approved" ? "success" : "danger"}>
                  {p.status === "approved" ? t("approved") : t("rejected")}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
