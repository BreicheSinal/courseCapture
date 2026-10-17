import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import type { ClassRow } from "@/types/supabase";
import { ClassTabs } from "./ClassTabs";
import { JoinCodeBar } from "./JoinCodeBar";
import { PageHeader } from "./PageHeader";

/**
 * Top of every class screen (T6, T11, T13): name, section and students, join code,
 * New course (secondary, as on the phone canvas, so each section keeps one primary action), section tabs.
 */
export function ClassHeader({ cls }: { cls: ClassRow & { student_count: number } }) {
  const t = useTranslations("teacher.classPage");
  const subtitle = [cls.section, t("students", { count: cls.student_count })].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={cls.name}
        subtitle={subtitle}
        size="large"
        back={{ href: "/teacher/classes", label: t("backToClasses") }}
        actions={
          <Link href={`/teacher/courses/new?class=${cls.id}`} className={buttonClasses({ variant: "secondary" })}>
            {t("newCourse")}
          </Link>
        }
      />
      <JoinCodeBar classId={cls.id} code={cls.join_code} />
      <ClassTabs classId={cls.id} />
    </div>
  );
}
