import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** Stage 2 placeholder for the teacher and student homes, replaced in stages 3 and 4. */
export function ComingSoon({ role, name }: { role: "teacher" | "student"; name: string }) {
  const t = useTranslations("auth.home");
  return (
    <Card className="max-w-3xl">
      <EmptyState
        icon={role === "teacher" ? "classes" : "courses"}
        headingLevel={2}
        title={t(role === "teacher" ? "teacherTitle" : "studentTitle", { name })}
        text={t(role === "teacher" ? "teacherText" : "studentText")}
      />
    </Card>
  );
}
