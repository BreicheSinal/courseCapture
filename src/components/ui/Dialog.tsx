"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type DialogProps = {
  title: ReactNode;
  /** Consequence or context, linked as the description. */
  description?: ReactNode;
  /** `alertdialog` for destructive confirmations (design-system DestructiveActionModal). */
  role?: "dialog" | "alertdialog";
  /** Called on Escape and a click on the scrim. */
  onClose: () => void;
  children?: ReactNode;
  className?: string;
  /**
   * Long content (design-system "sticky" modal): the title stays at the top,
   * `children` scroll, and `actions` stay at the bottom, so the buttons are
   * always in reach on a phone. Give submit buttons a `form` attribute when the
   * form is inside `children`.
   */
  sticky?: boolean;
  actions?: ReactNode;
};

/**
 * Modal over the page (design-system Modal / DestructiveActionModal): a scrim,
 * a labelled dialog, focus moved inside on open (to `[data-autofocus]` or the
 * first control), Tab kept inside, Escape and a scrim click close it.
 * Phones get it as a bottom sheet (system CSS).
 */
export function Dialog({
  title,
  description,
  role = "dialog",
  onClose,
  children,
  className,
  sticky,
  actions,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the setup effect on every render.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? el).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      } else if (e.key === "Tab") {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!el.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  return (
    <div
      className="cc-scrim cc-scrim--page"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn("cc-dialog focus:outline-none", sticky && "cc-dialog--sticky cc-dialog--tall", className)}
      >
        {sticky ? (
          <>
            <div className="cc-dialog__head">
              <h2 id={titleId} className="cc-dialog__title">
                {title}
              </h2>
              {description && (
                <div id={descId} className="cc-dialog__sub">
                  {description}
                </div>
              )}
            </div>
            <div className="cc-dialog__body">{children}</div>
            {actions && <div className="cc-dialog__actions">{actions}</div>}
          </>
        ) : (
          <>
            <h2 id={titleId} className="cc-dialog__title">
              {title}
            </h2>
            {description && (
              <div id={descId} className="cc-dialog__text">
                {description}
              </div>
            )}
            {children}
            {actions && <div className="cc-dialog__actions">{actions}</div>}
          </>
        )}
      </div>
    </div>
  );
}
