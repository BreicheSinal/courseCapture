import { useLocale, useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";
import type { UserRole } from "@/types/supabase";
import { AuthHeading } from "./AuthScreen";

/** Canvas T7c · Wrong account type: this account's role can't open the area it tried to. */
export function WrongAccount({
  email,
  role,
  area,
  home,
}: {
  email: string;
  role: UserRole;
  area: "teacher" | "student" | "admin";
  home: string;
}) {
  const t = useTranslations("auth.wrongAccount");
  const locale = useLocale();
  const title = role === "student" ? t("titleStudent") : role === "teacher" ? t("titleTeacher") : t("titleAdmin");
  const strong = (chunks: React.ReactNode) => <strong className="text-ink">{chunks}</strong>;
  const bodyKey =
    area === "admin" ? "bodyNotAdmin" : role === "student" ? "bodyStudent" : role === "teacher" ? "bodyTeacher" : "bodyAdmin";
  const cont = role === "student" ? t("continueStudent") : role === "teacher" ? t("continueTeacher") : t("continueAdmin");

  return (
    <>
      <AuthHeading icon="person" tone="warning" eyebrow={t("eyebrow")} title={title}>
        <p className="body text-ink-muted">{t.rich(bodyKey, { email, strong })}</p>
      </AuthHeading>

      <div className="flex flex-col gap-2">
        <Link href={home} className={`${buttonClasses({ variant: "primary", block: true })} no-underline`}>
          {cont}
        </Link>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonClasses({ variant: "secondary", block: true })}>
            {t("differentEmail")}
          </button>
        </form>
      </div>

      {area !== "admin" && (
        <Card as="section" aria-labelledby="need" className="flex flex-col gap-2 p-4">
          <h2 id="need" className="callout font-semibold">
            {area === "teacher" ? t("teacherQuestion") : t("studentQuestion")}
          </h2>
          <p className="subhead text-ink-muted">{area === "teacher" ? t("teacherHint") : t("studentHint")}</p>
        </Card>
      )}
    </>
  );
}
