import { serve } from "inngest/next";
import { inngest } from "@/jobs/client";
import { functions } from "@/jobs/generate-course";

// Inngest calls this route to run each step; a step may take a few minutes.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
