import "server-only";
import { after } from "next/server";
import { GENERATE_EVENT, inngest, isInngestConfigured } from "@/jobs/client";
import { failJob, runGeneration, type GenerationEvent } from "./run";

/**
 * Starts a generation job. With Inngest configured (production, or the dev
 * server with INNGEST_DEV=1) it runs in the background with step retries.
 * Without it, the job runs right after the response (next/server `after`),
 * within the page's maxDuration — enough for most courses, no retries.
 */
export async function queueGeneration(event: GenerationEvent & { teacherId: string }) {
  if (isInngestConfigured()) {
    await inngest.send({ name: GENERATE_EVENT, data: event });
    return;
  }
  after(async () => {
    try {
      await runGeneration(event, { run: (_name, fn) => fn() });
    } catch (e) {
      await failJob(event.jobId, e);
    }
  });
}
