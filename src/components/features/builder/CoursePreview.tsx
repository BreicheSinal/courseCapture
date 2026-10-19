import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Flashcards } from "@/components/features/student/Flashcards";
import type { BuilderModule } from "@/lib/courses/queries";
import { cn } from "@/lib/utils/cn";

/**
 * Preview (routes.md): the module as a student reads it, read-only, with the
 * quick check's right answer shown. Nothing here records progress.
 */
export function CoursePreview({
  courseId,
  title,
  modules,
  current,
  lang,
}: {
  courseId: string;
  title: string;
  modules: BuilderModule[];
  current: BuilderModule;
  lang: string;
}) {
  const t = useTranslations("teacher.preview");
  const te = useTranslations("teacher.editModule");
  const base = `/teacher/courses/${courseId}/preview?module=`;
  const prev = modules.find((m) => m.position === current.position - 1);
  const next = modules.find((m) => m.position === current.position + 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="cc-notice subhead" role="note">
        <Icon name="eye" />
        <p>{t("note")}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card className="h-fit p-2">
          <nav className="cc-toc" aria-label={t("modulesNav")}>
            {modules.map((m) => (
              <Link
                key={m.id}
                href={`${base}${m.position}`}
                aria-current={m.id === current.id ? "page" : undefined}
                className={cn("cc-toc__item min-h-control no-underline", m.id === current.id && "is-current")}
              >
                <span className="cc-toc__mark">{m.position}.</span>
                <span className="min-w-0 flex-1 truncate" dir="auto" lang={lang}>
                  {m.heading}
                </span>
              </Link>
            ))}
          </nav>
        </Card>

        <article className="flex min-w-0 flex-col gap-5" lang={lang}>
          <header className="flex flex-col gap-1">
            <span className="eyebrow text-accent-text">
              {t("moduleOf", { n: current.position, total: modules.length })}
            </span>
            <h2 className="title" dir="auto">
              {current.heading}
            </h2>
            <span className="subhead text-ink-muted" dir="auto">
              {title}
            </span>
          </header>
          {current.body && (
            <p className="body whitespace-pre-line" dir="auto">
              {current.body}
            </p>
          )}
          {current.key_points.length > 0 && (
            <Card as="section" aria-labelledby="pv-points" className="flex flex-col gap-3">
              <h3 id="pv-points" className="headline">
                {t("keyPoints")}
              </h3>
              <ul className="body m-0 flex list-disc flex-col gap-2 ps-5" dir="auto">
                {current.key_points.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </Card>
          )}
          {current.visual_svg && (
            <Card className="flex flex-col gap-3">
              <Badge variant="info" tint size="sm" className="self-start">
                {te("aiDrawn")}
              </Badge>
              <figure className="m-0 flex flex-col gap-3">
                <div
                  role="img"
                  aria-label={current.visual_alt || current.visual_caption || te("diagram")}
                  className="cc-diagram overflow-x-auto rounded-md border border-line p-3 text-ink"
                  // Sanitised when stored and again when read (src/lib/svg/sanitize.ts).
                  dangerouslySetInnerHTML={{ __html: current.visual_svg }}
                />
                {current.visual_caption && (
                  <figcaption className="callout" dir="auto">
                    {current.visual_caption}
                  </figcaption>
                )}
              </figure>
            </Card>
          )}
          {current.flashcards.length > 0 && <Flashcards cards={current.flashcards} lang={lang} />}
          {current.quiz && (
            <Card as="section" aria-labelledby="pv-quiz" className="flex flex-col gap-3">
              <h3 id="pv-quiz" className="headline">
                {t("quiz")}
              </h3>
              <p className="body" dir="auto">
                {current.quiz.question}
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {current.quiz.options.map((o, i) => {
                  const right = current.answer?.answer_index === i;
                  return (
                    <li key={i} className={cn("cc-option", right && "is-correct")} dir="auto">
                      <span className="flex-1">{o}</span>
                      {right && (
                        <span className="footnote flex flex-none items-center gap-1 font-semibold text-success">
                          <Icon name="check" width={14} height={14} />
                          {t("rightAnswer")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {current.answer?.explanation && (
                <p className="subhead text-ink-muted" dir="auto">
                  {current.answer.explanation}
                </p>
              )}
            </Card>
          )}
          <nav className="flex flex-wrap justify-between gap-2 border-t border-line pt-4" aria-label={t("pager")}>
            {prev ? (
              <Link href={`${base}${prev.position}`} className={buttonClasses({ variant: "secondary" })}>
                <Icon name="chevronBack" />
                {t("previous")}
              </Link>
            ) : (
              <span />
            )}
            <Link
              href={`/teacher/courses/${courseId}/modules/${current.position}/edit`}
              className={buttonClasses({ variant: "ghost" })}
            >
              <Icon name="pencil" />
              {t("edit")}
            </Link>
            {next ? (
              <Link href={`${base}${next.position}`} className={buttonClasses({ variant: "secondary" })}>
                {t("next")}
                <Icon name="chevronForward" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}
