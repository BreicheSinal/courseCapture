import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/features/teacher/PageHeader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("teacher.newCourse");
  return { title: t("metaTitle") };
}

/** T1 New course arrives in stage 5; until then, say so plainly. */
export default async function Page() {
  const t = await getTranslations("teacher.newCourse");
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageHeader title={t("title")} back={{ href: "/teacher/classes", label: t("back") }} />
      <EmptyState
        icon="courses"
        title={t("comingTitle")}
        text={t("comingText")}
        actions={
          <Link href="/teacher/classes" className={buttonClasses({ variant: "secondary" })}>
            {t("back")}
          </Link>
        }
      />
    </div>
  );
}
