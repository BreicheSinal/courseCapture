"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * "You joined Biology." after joining. A status region that appears with the
 * page isn't read out reliably, so focus moves to the message once instead.
 */
export function JoinedNotice({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <p
      ref={ref}
      tabIndex={-1}
      className="subhead flex items-center gap-2 rounded-md bg-accent-soft p-3 text-accent-text focus:outline-none focus-visible:ring-2"
    >
      <Icon name="checkCircle" width={18} height={18} />
      <span>{children}</span>
    </p>
  );
}
