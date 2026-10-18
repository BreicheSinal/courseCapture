import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/i18n/locales";
import { getBuilderCourse, getBuilderModules } from "@/lib/courses/queries";
import { buildCourseHtml, exportFileName } from "@/lib/courses/export";
import { createClient } from "@/lib/supabase/server";

/**
 * Export HTML (T3 "Export as HTML", issue #34). Only the course's teacher:
 * the file includes the quiz answers. Labels are in the course's language.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/courses/[courseId]/export">) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const course = await getBuilderCourse(courseId);
  if (!course || course.teacher_id !== user.id) return new Response("Not found.", { status: 404 });

  const modules = await getBuilderModules(courseId, course.content_locale);
  const locale: Locale = (locales as readonly string[]).includes(course.content_locale) ? (course.content_locale as Locale) : "en";
  const t = await getTranslations({ locale, namespace: "teacher.export" });
  const html = buildCourseHtml({ title: course.title, locale: course.content_locale }, modules, {
    keyPoints: t("keyPoints"),
    flashcards: t("flashcards"),
    quiz: t("quiz"),
    showAnswer: t("showAnswer"),
    module: (n, total) => t("module", { n, total }),
    footer: t("footer"),
  });
  const name = exportFileName(course.title);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${name.ascii}"; filename*=UTF-8''${name.utf8}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
