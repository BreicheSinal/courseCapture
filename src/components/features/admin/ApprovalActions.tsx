"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { setTeacherStatus } from "@/lib/auth/admin-actions";

/**
 * Approve / Reject for one pending teacher. Reject confirms in place
 * ("Sure?", design-system Button rule) and resets after a few seconds.
 * The teacher's name is part of each button's accessible name.
 */
export function ApprovalActions({ id, name }: { id: string; name: string }) {
  const t = useTranslations("admin.teachers");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <form action={setTeacherStatus} className="flex gap-2">
      <input type="hidden" name="teacher" value={id} />
      <Button
        type="submit"
        name="status"
        value="rejected"
        variant="danger"
        data-confirm={confirming || undefined}
        onClick={(e) => {
          if (!confirming) {
            e.preventDefault();
            setConfirming(true);
          }
        }}
        onBlur={() => setConfirming(false)}
      >
        {confirming ? t("sure") : t("reject")}
        <span className="sr-only"> {name}</span>
      </Button>
      <Button type="submit" name="status" value="approved" variant="secondary">
        {t("approve")}
        <span className="sr-only"> {name}</span>
      </Button>
    </form>
  );
}
