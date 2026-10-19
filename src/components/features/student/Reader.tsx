import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { ModuleContent } from "@/lib/student/queries";
import type { StudentCourse, StudentModuleState } from "@/types/supabase";
import { CompleteButton } from "./CompleteButton";
import { Flashcards } from "./Flashcards";
import { DiagramFrame } from "@/components/ui/DiagramFrame";

/** Segmented "Module n of N" bar: done, current, to come (canvas S3 / S4). */
export function ModuleSteps({ modules, current }: { modules: StudentModuleState[]; current: number }) {
  const t = useTranslations("student.reader");
  const done = modules.filter((m) => m.done).length;
  return (
    <div
      role="progressbar"
      aria-label={t("modulesComplete")}
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={modules.length}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }}
    >
      {modules.map((m) => (
        <span
          key={m.module_id}
          className={cn(
            "h-1 rounded-pill",
            m.done ? "bg-accent" : m.position === current ? "bg-accent opacity-50" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

/** The course's modules beside the reader on wide screens (design-system ModuleNav). */
function ModuleNav({
  courseId,
  modules,
  current,
  lang,
}: {
  courseId: string;
  modules: StudentModuleState[];
  current: number;
  lang: string;
}) {
  const t = useTranslations("student.reader");
  return (
    <Card className="hidden self-start p-2 lg:block">
      <nav className="cc-toc" aria-label={t("modulesNav")}>
        {modules.map((m) => (
          <Link
            key={m.module_id}
            href={`/student/courses/${courseId}/modules/${m.position}`}
            aria-current={m.position === current ? "page" : undefined}
            className={cn(
              "cc-toc__item min-h-control no-underline",
              m.done && "is-done",
              m.position === current && "is-current",
            )}
          >
            <span className="cc-toc__mark">{m.done ? "✓" : `${m.position}.`}</span>
            <span className="min-w-0 truncate">
              <bdi lang={lang}>{m.heading}</bdi>
            </span>
            {m.done && <span className="sr-only">{t("done")}</span>}
          </Link>
        ))}
      </nav>
    </Card>
  );
}

/** Canvas S3 · Module reader: explanation, key points, diagram, flashcards, then the quick check. */
export function Reader({
  course,
  modules,
  module: mod,
}: {
  course: StudentCourse;
  modules: StudentModuleState[];
  module: ModuleContent;
}) {
  const t = useTranslations("student.reader");
  const base = `/student/courses/${course.course_id}`;
  const state = modules.find((m) => m.position === mod.position);
  const next = modules.find((m) => m.position > mod.position)?.position ?? null;
  const hasQuiz = !!mod.quiz && mod.quiz.options.length > 0;
  // The course's language may differ from the interface language (decision #9).
  const lang = course.content_locale;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href={base}
          aria-label={t("back", { title: course.title })}
          className="grid size-control flex-none place-items-center rounded-sm border border-line-strong bg-surface text-ink"
        >
          <Icon name="chevronBack" width={18} height={18} />
        </Link>
        <p className="callout flex-1 text-center font-semibold">
          {t("position", { n: mod.position, total: modules.length })}
        </p>
        <Link
          href={base}
          aria-label={t("allModules")}
          className="grid size-control flex-none place-items-center rounded-sm border border-line-strong bg-surface text-ink lg:invisible"
        >
          <Icon name="list" width={18} height={18} />
        </Link>
      </div>
      <ModuleSteps modules={modules} current={mod.position} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ModuleNav courseId={course.course_id} modules={modules} current={mod.position} lang={lang} />

        <article className="flex max-w-3xl min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-1">
            <p className="eyebrow text-accent-text">
              <bdi lang={lang}>{course.title}</bdi>
            </p>
            <h1 id="page-title" tabIndex={-1} className="title focus:outline-none" dir="auto" lang={lang}>
              {mod.heading}
            </h1>
          </header>

          {mod.body && (
            <p className="body whitespace-pre-line" dir="auto" lang={lang}>
              {mod.body}
            </p>
          )}

          {mod.key_points.length > 0 && (
            <Card as="section" aria-labelledby="key-points" className="flex flex-col gap-3">
              <h2 id="key-points" className="headline">
                {t("keyPoints")}
              </h2>
              <ul className="body m-0 flex list-disc flex-col gap-2 ps-5" dir="auto" lang={lang}>
                {mod.key_points.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </Card>
          )}

          {mod.visual_svg && (
            <Card as="div" className="flex flex-col gap-3">
              {/* Sanitised on save and again when read (src/lib/svg/sanitize.ts). */}
              <DiagramFrame
                svg={mod.visual_svg}
                alt={mod.visual_alt ?? ""}
                caption={mod.visual_caption}
                aiLabel={t("diagramBy")}
                lang={lang}
              />
            </Card>
          )}

          {mod.flashcards.length > 0 && <Flashcards cards={mod.flashcards} lang={lang} />}

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            {hasQuiz ? (
              <Link
                href={`${base}/modules/${mod.position}/check`}
                className={buttonClasses({ variant: "primary", block: true })}
              >
                {t("toQuiz")}
              </Link>
            ) : (
              <CompleteButton courseId={course.course_id} moduleId={mod.id} next={next} last={next === null} />
            )}
            {state?.done && (
              <p className="footnote flex items-center justify-center gap-1 text-ink-muted">
                <Icon name="check" width={14} height={14} />
                {t("saved")}
              </p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
