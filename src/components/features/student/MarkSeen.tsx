"use client";

import { useEffect } from "react";
import { markAnnouncementsSeen } from "@/lib/student/actions";

/** Marks the announcements on screen as seen, once, after they render ("seen by" for the teacher). */
export function MarkSeen({ ids }: { ids: string[] }) {
  const key = ids.join(",");
  useEffect(() => {
    if (key) void markAnnouncementsSeen(key.split(","));
  }, [key]);
  return null;
}
