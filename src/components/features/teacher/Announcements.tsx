"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { deleteAnnouncement, postAnnouncement } from "@/lib/classes/actions";
import type { AnnouncementItem } from "@/lib/classes/queries";
import { isolate } from "./rich";

const MAX = 500;
const length = (s: string) => [...s].length; // characters, as the database counts them

/** Canvas T13 · Announcements: post to everyone in the class; newest first, with "seen by". */
export function Announcements({
  classId,
  className,
  studentCount,
  items,
}: {
  classId: string;
  className: string;
  studentCount: number;
  items: AnnouncementItem[];
}) {
  const t = useTranslations("teacher.announcements");
  const format = useFormatter();
  const toast = useToast();
  const [text, setText] = useState("");
  const pastRef = useRef<HTMLHeadingElement>(null);
  const [state, action, posting] = useActionState(
    async (prev: Parameters<typeof postAnnouncement>[0], formData: FormData) => {
      const result = await postAnnouncement(prev, formData);
      // After a successful post: clear the box and say so.
      if (result?.posted) {
        setText("");
        toast(t("posted"), "success");
      }
      return result;
    },
    undefined,
  );

  const error = state?.error ? t(`errors.${state.error}`) : undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <form action={action} className="cc-card flex flex-col gap-3" noValidate>
        <input type="hidden" name="class" value={classId} />
        <TextArea
          label={t("new")}
          name="body"
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX}
          placeholder={t("placeholder")}
          hint={t("audience", { count: studentCount })}
          meta={`${format.number(length(text))}/${format.number(MAX)}`}
          error={error}
        />
        <Button type="submit" variant="primary" busy={posting} className="self-end" disabled={!text.trim()}>
          {posting ? t("posting") : t("post", { name: className })}
        </Button>
      </form>

      <section aria-labelledby="past" className="flex flex-col gap-3">
        <h2 id="past" ref={pastRef} tabIndex={-1} className="eyebrow text-ink-muted focus:outline-none">
          {t("pastTitle")}
        </h2>
        {items.length === 0 ? (
          <EmptyState icon="megaphone" title={t("emptyTitle")} text={t.rich("emptyText", { ...isolate, name: className })} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((a, i) => (
              <li key={a.id}>
                <AnnouncementCard
                  item={a}
                  date={format.dateTime(new Date(a.created_at), { month: "short", day: "numeric" })}
                  onDeleted={(ok) => {
                    toast(ok ? t("deleted") : t("deleteFailed"), ok ? "default" : "error");
                    if (!ok) return;
                    // The card goes away: move focus to the next card's delete button, or the list heading.
                    const nextId = items[i + 1]?.id ?? items[i - 1]?.id;
                    requestAnimationFrame(() => {
                      const next = nextId && document.querySelector<HTMLElement>(`[data-announcement="${nextId}"]`);
                      (next || pastRef.current)?.focus();
                    });
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AnnouncementCard({ item, date, onDeleted }: { item: AnnouncementItem; date: string; onDeleted: (ok: boolean) => void }) {
  const t = useTranslations("teacher.announcements");
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const remove = () => {
    if (!confirming) return setConfirming(true);
    setConfirming(false);
    start(async () => onDeleted(await deleteAnnouncement(item.id)));
  };

  // One button that keeps its place and focus: trash icon, then "Sure?".
  const label = confirming ? t("sureLabel", { date }) : t("deleteLabel", { date });
  return (
    <article className="cc-note">
      <div className="cc-note__head">
        <span>{t("meta", { date, count: item.seen })}</span>
        <button
          type="button"
          data-announcement={item.id}
          className={
            confirming
              ? "cc-btn cc-btn--secondary cc-btn--sm min-h-control"
              : "cc-iconbtn cc-iconbtn--xs min-h-control min-w-control"
          }
          onClick={remove}
          disabled={pending}
          aria-busy={pending || undefined}
          aria-label={label}
          title={label}
        >
          {confirming ? t("sure") : <Icon name="trash" />}
        </button>
      </div>
      <p className="cc-note__body" dir="auto">
        {item.body}
      </p>
    </article>
  );
}
