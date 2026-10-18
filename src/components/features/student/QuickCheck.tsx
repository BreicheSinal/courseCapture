"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { answerQuiz } from "@/lib/student/actions";
import { cn } from "@/lib/utils/cn";
import type { StudentModuleState } from "@/types/supabase";
import { CompleteButton } from "./CompleteButton";
import { ModuleSteps } from "./Reader";

type Result = { chosen: number; correct: boolean; answer: number; explanation: string; first: boolean };

/**
 * Canvas S4 · Quick check: one question per module. The first answer counts;
 * picking again later still shows the right answer but doesn't change the
 * score (decision #6). The answer comes from the server only after a pick.
 */
export function QuickCheck({
  courseId,
  courseTitle,
  lang,
  modules,
  module: mod,
  initial,
}: {
  courseId: string;
  courseTitle: string;
  lang: string;
  modules: StudentModuleState[];
  module: { id: string; position: number; heading: string; question: string; options: string[] };
  initial: { chosen_index: number; is_correct: boolean; answer_index: number; explanation: string } | null;
}) {
  const t = useTranslations("student.quiz");
  const [result, setResult] = useState<Result | null>(
    initial
      ? {
          chosen: initial.chosen_index,
          correct: initial.is_correct,
          answer: initial.answer_index,
          explanation: initial.explanation,
          first: true,
        }
      : null,
  );
  const [counted, setCounted] = useState<boolean | null>(initial ? initial.is_correct : null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const next = modules.find((m) => m.position > mod.position)?.position ?? null;
  const base = `/student/courses/${courseId}`;

  const pick = (choice: number) => {
    if (pending) return;
    setFailed(false);
    start(async () => {
      const r = await answerQuiz(mod.id, choice);
      if (!r) return setFailed(true);
      setResult({
        chosen: choice,
        correct: r.is_correct,
        answer: r.answer_index,
        explanation: r.explanation,
        first: r.first_try,
      });
      if (r.first_try) setCounted(r.is_correct);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href={`${base}/modules/${mod.position}`}
          aria-label={t("back", { heading: mod.heading })}
          className="grid size-control flex-none place-items-center rounded-sm border border-line-strong bg-surface text-ink"
        >
          <Icon name="chevronBack" width={18} height={18} />
        </Link>
        <p className="callout flex-1 text-center font-semibold">
          {t("position", { n: mod.position, total: modules.length })}
        </p>
        <span className="size-control flex-none" aria-hidden="true" />
      </div>
      <ModuleSteps modules={modules} current={mod.position} />

      <div className="flex flex-col gap-1">
        <p className="eyebrow text-accent-text">
          {t("eyebrow")} · <bdi lang={lang}>{courseTitle}</bdi>
        </p>
        <h1 id="question" className="title" dir="auto" lang={lang}>
          {mod.question}
        </h1>
      </div>

      <div role="group" aria-labelledby="question" className="flex flex-col gap-2">
        {mod.options.map((text, i) => {
          const isAnswer = result?.answer === i;
          const isPicked = result?.chosen === i;
          const showRight = !!result && isAnswer;
          const showWrong = !!result && isPicked && !isAnswer;
          return (
            <button
              key={i}
              type="button"
              className={cn("cc-option min-h-control", showRight && "is-correct", showWrong && "is-wrong")}
              aria-pressed={isPicked}
              aria-describedby={result && (showRight || showWrong) ? "quiz-feedback" : undefined}
              aria-disabled={pending || undefined}
              onClick={() => pick(i)}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="subhead grid size-7 flex-none place-items-center rounded-pill bg-surface-sunken font-semibold"
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span dir="auto" lang={lang}>
                  {text}
                </span>
              </span>
              {showRight && (
                <span className="cc-option__mark">
                  <span aria-hidden="true">✓ </span>
                  {isPicked ? t("correct") : t("correctAnswer")}
                </span>
              )}
              {showWrong && (
                <span className="cc-option__mark">
                  <span aria-hidden="true">✕ </span>
                  {t("yourAnswer")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div ref={feedbackRef} tabIndex={-1} id="quiz-feedback" className="focus:outline-none">
        {result && (
          <div
            className={cn(
              "flex flex-col gap-1 rounded-md border-2 p-4",
              result.chosen === result.answer ? "border-success" : "border-danger",
            )}
          >
            <span
              className={cn("callout font-semibold", result.chosen === result.answer ? "text-success" : "text-danger")}
            >
              {result.chosen === result.answer ? t("rightTitle") : t("wrongTitle")}
            </span>
            {result.explanation && (
              <span className="callout" dir="auto" lang={lang}>
                {result.explanation}
              </span>
            )}
            <span className="footnote text-ink-muted">
              {counted === null ? "" : counted ? t("countedRight") : t("countedWrong")}
            </span>
          </div>
        )}
        {failed && <p className="footnote text-danger">{t("failed")}</p>}
      </div>

      <div className="border-t border-line pt-4">
        <CompleteButton
          courseId={courseId}
          moduleId={mod.id}
          next={next}
          last={next === null}
          disabled={!result}
          hint={t("pickFirst")}
        />
      </div>
    </div>
  );
}
