"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { TextArea } from "@/components/ui/TextArea";
import {
  deleteModule,
  redrawVisual,
  removeVisual,
  saveModule,
  uncheckModule,
  type DeleteModuleState,
  type EditorPayload,
  type SaveState,
  type VisualState,
} from "@/lib/courses/actions";
import type { BuilderModule } from "@/lib/courses/queries";
import { FALLBACK_NOTE } from "@/lib/generation/fallback";

type Quiz = NonNullable<EditorPayload["quiz"]>;
const emptyQuiz = (): Quiz => ({ question: "", options: ["", "", "", ""], answer_index: 0, explanation: "" });

/**
 * T4 · Edit module: heading, explanation, key points, diagram (caption, alt
 * text, regenerate, remove), flashcards and the quick check with its right
 * answer. "Mark as checked" saves too, then opens the next module to check.
 */
export function ModuleEditor({
  courseId,
  module: m,
  total,
  contentLocale,
  aiReady,
  redrawsLeft,
  isRtl,
}: {
  courseId: string;
  module: BuilderModule;
  total: number;
  contentLocale: string;
  aiReady: boolean;
  redrawsLeft: number;
  isRtl: boolean;
}) {
  const t = useTranslations("teacher.editModule");
  const te = useTranslations("teacher.courseErrors");
  const locale = useLocale();
  const [heading, setHeading] = useState(m.heading);
  const [body, setBody] = useState(m.body);
  const [points, setPoints] = useState<string[]>(m.key_points.length ? m.key_points : [""]);
  const [cards, setCards] = useState(m.flashcards);
  const [quiz, setQuiz] = useState<Quiz | null>(
    m.quiz
      ? {
          question: m.quiz.question,
          options:
            m.quiz.options.length >= 4
              ? m.quiz.options
              : [...m.quiz.options, ...Array(4 - m.quiz.options.length).fill("")],
          answer_index: m.answer?.answer_index ?? -1,
          explanation: m.answer?.explanation ?? "",
        }
      : null,
  );
  const [caption, setCaption] = useState(m.visual_caption ?? "");
  const [alt, setAlt] = useState(m.visual_alt ?? "");
  // A new diagram brings its own caption and alt text (state adjusted during render, not in an effect).
  const [seenSvg, setSeenSvg] = useState(m.visual_svg);
  if (seenSvg !== m.visual_svg) {
    setSeenSvg(m.visual_svg);
    setCaption(m.visual_caption ?? "");
    setAlt(m.visual_alt ?? "");
  }

  const [state, action, saving] = useActionState<SaveState, FormData>(saveModule, undefined);
  const [visualState, redraw, drawing] = useActionState<VisualState, FormData>(redrawVisual, undefined);
  const [removing, startRemove] = useTransition();
  const [sureRemove, setSureRemove] = useState(false);
  const [unchecking, startUncheck] = useTransition();

  const payload: EditorPayload = {
    heading,
    body,
    key_points: points.map((p) => p.trim()).filter(Boolean),
    flashcards: cards.filter((c) => c.q.trim() && c.a.trim()),
    quiz,
    caption,
    alt,
  };
  const note = m.review_note === FALLBACK_NOTE ? t("fallbackNote") : m.review_note;
  const err = state?.error ? te(state.error) : null;
  const dir = isRtl ? "rtl" : "auto";

  return (
    <div className="flex flex-col gap-5">
      {note && !m.checked_at && (
        <div className="cc-notice cc-notice--warning subhead" role="note">
          <Icon name="alert" />
          <p>
            <strong>{t("needsCheck")}</strong> <span className="text-ink">{note}</span>
          </p>
        </div>
      )}
      {m.checked_at && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="subhead flex items-center gap-1 font-semibold text-success">
            <Icon name="check" width={16} height={16} />
            {t("checked")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-control"
            busy={unchecking}
            onClick={() => startUncheck(async () => void (await uncheckModule(m.id)))}
          >
            {t("uncheck")}
          </Button>
        </div>
      )}

      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="course" value={courseId} />
        <input type="hidden" name="module" value={m.id} />
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />

        <Card as="section" aria-labelledby="text-title" className="flex flex-col gap-4">
          <h2 id="text-title" className="headline">
            {t("textTitle")}
          </h2>
          <Field
            label={t("heading")}
            value={heading}
            onChange={(e) => setHeading(e.currentTarget.value)}
            maxLength={120}
            required
            dir={dir}
            lang={contentLocale}
            error={state?.error === "headingRequired" ? err : undefined}
          />
          <TextArea
            label={t("body")}
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            maxLength={2000}
            rows={4}
            dir={dir}
            lang={contentLocale}
          />
        </Card>

        <ListSection
          id="key-points"
          title={t("keyPoints")}
          addLabel={t("addKeyPoint")}
          canAdd={points.length < 8}
          onAdd={() => setPoints([...points, ""])}
        >
          {points.map((p, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field
                className="flex-1"
                label={t("keyPointN", { n: i + 1 })}
                value={p}
                maxLength={300}
                dir={dir}
                lang={contentLocale}
                onChange={(e) => setPoints(points.map((x, j) => (j === i ? e.currentTarget.value : x)))}
              />
              <IconButton
                icon="trash"
                label={t("removeKeyPoint", { n: i + 1 })}
                onClick={() => setPoints(points.filter((_, j) => j !== i))}
              />
            </div>
          ))}
        </ListSection>

        <Card as="section" aria-labelledby="diagram-title" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="diagram-title" className="headline">
              {t("diagram")}
            </h2>
            {m.visual_svg && (
              <Badge variant="info" tint size="sm">
                {t("aiDrawn")}
              </Badge>
            )}
          </div>
          {m.visual_svg ? (
            <>
              <div
                role="img"
                aria-label={alt || m.visual_alt || caption || t("diagram")}
                lang={contentLocale}
                className="cc-diagram cc-diagram--edit rounded-md border border-line p-3 text-ink"
                // Sanitised when stored and again when read (src/lib/svg/sanitize.ts).
                dangerouslySetInnerHTML={{ __html: m.visual_svg }}
              />
              <Field
                label={t("caption")}
                value={caption}
                onChange={(e) => setCaption(e.currentTarget.value)}
                maxLength={200}
                dir={dir}
                lang={contentLocale}
              />
              <TextArea
                label={t("alt")}
                hint={t("altHint")}
                value={alt}
                onChange={(e) => setAlt(e.currentTarget.value)}
                maxLength={400}
                rows={2}
                required
                dir={dir}
                lang={contentLocale}
                error={state?.error === "altRequired" ? err : undefined}
              />
            </>
          ) : (
            <p className="subhead text-ink-muted">{t("noDiagram")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {aiReady && (
              <Button
                type="submit"
                formAction={redraw}
                variant="secondary"
                busy={drawing}
                aria-disabled={redrawsLeft <= 0 || undefined}
                onClick={(e) => redrawsLeft <= 0 && e.preventDefault()}
              >
                <Icon name="refresh" />
                {drawing ? t("drawing") : m.visual_svg ? t("regenerate") : t("draw")}
              </Button>
            )}
            {m.visual_svg && (
              <Button
                variant="secondary"
                busy={removing}
                onClick={() =>
                  sureRemove
                    ? startRemove(async () => void (await removeVisual(m.id), setSureRemove(false)))
                    : setSureRemove(true)
                }
              >
                <Icon name="trash" />
                {sureRemove ? t("removeSure") : t("removeDiagram")}
              </Button>
            )}
          </div>
          <p className="footnote text-ink-muted" aria-live="polite">
            {visualState?.error ? (
              <span className="text-danger">{te(visualState.error)}</span>
            ) : aiReady ? (
              t("redrawsLeft", { count: redrawsLeft })
            ) : (
              t("noAiDraw")
            )}
          </p>
        </Card>

        <ListSection
          id="flashcards"
          title={t("flashcards")}
          addLabel={t("addCard")}
          canAdd={cards.length < 8}
          onAdd={() => setCards([...cards, { q: "", a: "" }])}
          empty={cards.length === 0 ? t("noCards") : null}
        >
          {cards.map((c, i) => (
            <fieldset key={i} className="cc-group flex flex-col gap-3 rounded-md border border-line p-3">
              <legend className="subhead px-1 font-semibold">{t("cardN", { n: i + 1 })}</legend>
              <Field
                label={t("front")}
                value={c.q}
                maxLength={300}
                dir={dir}
                lang={contentLocale}
                onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, q: e.currentTarget.value } : x)))}
              />
              <Field
                label={t("back")}
                value={c.a}
                maxLength={300}
                dir={dir}
                lang={contentLocale}
                onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, a: e.currentTarget.value } : x)))}
              />
              <Button
                variant="ghost"
                size="sm"
                className="min-h-control self-start"
                onClick={() => setCards(cards.filter((_, j) => j !== i))}
              >
                {t("removeCard", { n: i + 1 })}
              </Button>
            </fieldset>
          ))}
        </ListSection>

        <QuizSection
          quiz={quiz}
          setQuiz={setQuiz}
          dir={dir}
          lang={contentLocale}
          error={state?.error === "answerRequired" || state?.error === "optionsRequired" ? err : null}
        />

        {err && !["headingRequired", "altRequired", "answerRequired", "optionsRequired"].includes(state!.error!) && (
          <p className="subhead text-danger" role="alert">
            {err}
          </p>
        )}
        {state?.saved && !err && (
          <p role="status" className="subhead flex items-center gap-1 font-semibold text-success">
            <Icon name="check" width={16} height={16} />
            {t("saved")}
          </p>
        )}

        <div className="cc-actionbar sticky z-10 -mx-4 flex flex-wrap gap-2 border-t border-line bg-surface px-4 py-3 sm:mx-0 sm:rounded-md sm:border">
          <Button
            type="submit"
            name="intent"
            value="check"
            variant="primary"
            busy={saving}
            className="flex-1 sm:flex-none"
          >
            {t("markChecked")}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="save"
            variant="secondary"
            busy={saving}
            className="flex-1 sm:flex-none"
          >
            {t("save")}
          </Button>
          {/* Phones keep only the two main actions in the bar; the preview link is under the form. */}
          <Link
            href={`/teacher/courses/${courseId}/preview?module=${m.position}`}
            className={cn(buttonClasses({ variant: "ghost" }), "max-sm:hidden")}
          >
            {t("preview")}
          </Link>
          <span className="footnote ms-auto self-center text-ink-muted max-sm:hidden">
            {t("position", { n: m.position, total })}
          </span>
        </div>
        <Link
          href={`/teacher/courses/${courseId}/preview?module=${m.position}`}
          className={cn(buttonClasses({ variant: "ghost" }), "self-start sm:hidden")}
        >
          {t("preview")}
        </Link>
      </form>

      <DeleteModule courseId={courseId} moduleId={m.id} only={total <= 1} />
    </div>
  );
}

function ListSection({
  id,
  title,
  addLabel,
  canAdd,
  onAdd,
  empty,
  children,
}: {
  id: string;
  title: string;
  addLabel: string;
  canAdd: boolean;
  onAdd: () => void;
  empty?: string | null;
  children: React.ReactNode;
}) {
  return (
    <Card as="section" aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="headline">
        {title}
      </h2>
      {empty && <p className="subhead text-ink-muted">{empty}</p>}
      {children}
      {canAdd && (
        <Button variant="ghost" className="self-start" onClick={onAdd}>
          <Icon name="plus" />
          {addLabel}
        </Button>
      )}
    </Card>
  );
}

function QuizSection({
  quiz,
  setQuiz,
  dir,
  lang,
  error,
}: {
  quiz: Quiz | null;
  setQuiz: (q: Quiz | null) => void;
  dir: "rtl" | "auto";
  lang: string;
  error: string | null;
}) {
  const t = useTranslations("teacher.editModule");
  const group = useId();
  return (
    <Card as="section" aria-labelledby="quiz-title" className="flex flex-col gap-3">
      <h2 id="quiz-title" className="headline">
        {t("quiz")}
      </h2>
      {!quiz ? (
        <>
          <p className="subhead text-ink-muted">{t("noQuiz")}</p>
          <Button variant="secondary" className="self-start" onClick={() => setQuiz(emptyQuiz())}>
            <Icon name="plus" />
            {t("addQuiz")}
          </Button>
        </>
      ) : (
        <>
          <TextArea
            label={t("question")}
            value={quiz.question}
            rows={2}
            maxLength={300}
            dir={dir}
            lang={lang}
            onChange={(e) => setQuiz({ ...quiz, question: e.currentTarget.value })}
          />
          <fieldset className="cc-group flex flex-col gap-2" aria-describedby={error ? `${group}-err` : undefined}>
            <legend className="subhead mb-1 font-semibold">{t("options")}</legend>
            {quiz.options.map((o, i) => (
              <div key={i} className="flex items-center gap-3">
                <label
                  className="cc-check cc-check--radio min-h-control min-w-control flex-none items-center justify-center"
                  title={t("correctN", { n: i + 1 })}
                >
                  <input
                    type="radio"
                    className="cc-check__input"
                    name={`${group}-answer`}
                    checked={quiz.answer_index === i}
                    onChange={() => setQuiz({ ...quiz, answer_index: i })}
                    aria-label={t("correctN", { n: i + 1 })}
                  />
                  <span className="cc-check__box" aria-hidden="true" />
                </label>
                <Field
                  className="flex-1"
                  label={t("optionN", { n: i + 1 })}
                  value={o}
                  maxLength={200}
                  dir={dir}
                  lang={lang}
                  onChange={(e) =>
                    setQuiz({ ...quiz, options: quiz.options.map((x, j) => (j === i ? e.currentTarget.value : x)) })
                  }
                />
              </div>
            ))}
            <span className="footnote text-ink-muted">
              {quiz.answer_index >= 0 ? t("correctIs", { n: quiz.answer_index + 1 }) : t("pickCorrect")}
            </span>
            {error && (
              <span id={`${group}-err`} className="cc-field__error" role="alert">
                {error}
              </span>
            )}
          </fieldset>
          <TextArea
            label={t("explanation")}
            hint={t("explanationHint")}
            value={quiz.explanation}
            rows={2}
            maxLength={600}
            dir={dir}
            lang={lang}
            onChange={(e) => setQuiz({ ...quiz, explanation: e.currentTarget.value })}
          />
          <Button variant="ghost" className="self-start" onClick={() => setQuiz(null)}>
            {t("removeQuiz")}
          </Button>
        </>
      )}
    </Card>
  );
}

function DeleteModule({ courseId, moduleId, only }: { courseId: string; moduleId: string; only: boolean }) {
  const t = useTranslations("teacher.editModule");
  const te = useTranslations("teacher.courseErrors");
  const locale = useLocale();
  const [sure, setSure] = useState(false);
  const [state, action, deleting] = useActionState<DeleteModuleState, FormData>(deleteModule, undefined);
  if (only) return <p className="footnote text-ink-muted">{t("onlyModule")}</p>;
  return (
    <form action={action} className="flex flex-col items-start gap-2 border-t border-line pt-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="course" value={courseId} />
      <input type="hidden" name="module" value={moduleId} />
      <Button
        type={sure ? "submit" : "button"}
        variant={sure ? "danger" : "secondary"}
        busy={deleting}
        onClick={(e) => {
          if (!sure) {
            e.preventDefault();
            setSure(true);
          }
        }}
      >
        <Icon name="trash" />
        {deleting ? t("deleting") : sure ? t("deleteSure") : t("delete")}
      </Button>
      <span className="footnote text-ink-muted">{t("deleteHint")}</span>
      {state?.error && (
        <span className="subhead text-danger" role="alert">
          {te(state.error)}
        </span>
      )}
    </form>
  );
}
