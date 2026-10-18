"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";

/** Module flashcards (design-system Flashcard): tap to reveal; previous / next between cards. Not scored. */
export function Flashcards({ cards, lang }: { cards: { q: string; a: string }[]; lang?: string }) {
  const t = useTranslations("student.reader");
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const card = cards[i];
  const go = (n: number) => {
    setI(n);
    setOpen(false);
  };

  return (
    <section aria-labelledby="flashcards" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="flashcards" className="headline">
          {t("flashcards")}
        </h2>
        <div className="flex items-center gap-2">
          <span className="subhead text-ink-muted tabular-nums" aria-live="polite">
            {t("cardOf", { n: i + 1, total: cards.length })}
          </span>
          {cards.length > 1 && (
            <>
              <IconButton
                icon="chevronBack"
                label={t("prevCard")}
                className="size-control"
                aria-disabled={i === 0 || undefined}
                onClick={() => i > 0 && go(i - 1)}
              />
              <IconButton
                icon="chevronForward"
                label={t("nextCard")}
                className="size-control"
                aria-disabled={i === cards.length - 1 || undefined}
                onClick={() => i < cards.length - 1 && go(i + 1)}
              />
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className={cn("cc-flash min-h-36", open && "is-open")}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="eyebrow text-ink-muted">{open ? t("answer") : t("question")}</span>
        {open ? (
          <span className="cc-flash__answer" dir="auto" lang={lang}>
            {card.a}
          </span>
        ) : (
          <>
            <span dir="auto" lang={lang}>
              {card.q}
            </span>
            <span className="cc-flash__hint">{t("tapToReveal")}</span>
          </>
        )}
      </button>
    </section>
  );
}
