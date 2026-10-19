"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { regenerateJoinCode } from "@/lib/classes/actions";
import { cn } from "@/lib/utils/cn";

/**
 * Join code with Copy and a two-step New code (design-system JoinCode;
 * canvas T6 and T9). The New code button keeps its place and focus: the first
 * press changes its text to "Sure?", the second makes the new code.
 * `size="lg"` is the big code on the class-created screen.
 */
export function JoinCodeBar({
  classId,
  code: initial,
  size = "md",
  onChange,
}: {
  classId: string;
  code: string;
  size?: "md" | "lg";
  onChange?: (code: string) => void;
}) {
  const t = useTranslations("teacher.joinCode");
  const toast = useToast();
  const [code, setCode] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  // A new code from the server (e.g. after a refresh) replaces the shown one.
  const [shownInitial, setShownInitial] = useState(initial);
  if (initial !== shownInitial) {
    setShownInitial(initial);
    setCode(initial);
  }

  // "Sure?" goes back to "New code" if the teacher doesn't confirm.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t("copied"), "success");
    } catch {
      toast(t("copyFailed"), "error");
    }
  };

  const renew = () => {
    if (!confirming) return setConfirming(true);
    setConfirming(false);
    start(async () => {
      const next = await regenerateJoinCode(classId);
      if (next) {
        setCode(next);
        onChange?.(next);
        toast(t("renewed", { code: next }), "success");
      } else {
        toast(t("renewFailed"), "error");
      }
    });
  };

  const lg = size === "lg";
  const renewLabel = confirming ? t("sureLabel") : t("renewLabel");

  return (
    <div className={cn("cc-codebar bg-accent-soft text-accent-text", lg && "w-full flex-col items-stretch text-center")}>
      <div className={cn("flex min-w-0 flex-col", lg && "items-center")}>
        <span className="eyebrow">{t("label")}</span>
        <span className={cn("join-code select-all", lg && "join-code--lg")} dir="ltr">
          {code}
        </span>
      </div>
      <div className={lg ? "grid grid-cols-2 gap-2" : "flex items-center gap-2"}>
        <button
          type="button"
          className={lg ? "cc-btn cc-btn--secondary" : "cc-iconbtn"}
          onClick={copy}
          aria-label={lg ? undefined : t("copyLabel")}
          title={lg ? undefined : t("copyLabel")}
        >
          <Icon name="copy" />
          {lg && t("copy")}
        </button>
        <button
          type="button"
          className={lg || confirming ? "cc-btn cc-btn--secondary" : "cc-iconbtn"}
          onClick={renew}
          disabled={pending}
          aria-busy={pending || undefined}
          aria-label={lg && !confirming ? undefined : renewLabel}
          title={renewLabel}
        >
          {(lg || !confirming) && <Icon name="refresh" />}
          {confirming ? t("sure") : lg && t("renew")}
        </button>
      </div>
    </div>
  );
}
