import "server-only";
import { NonRetriableError } from "inngest";
import { failJob, isPermanent, JobError, runGeneration, type GenerationEvent, type JobErrorKey } from "@/lib/generation/run";
import { GENERATE_EVENT, inngest } from "./client";

const keys: JobErrorKey[] = ["unsupported_type", "too_large", "not_pptx", "unreadable", "no_text", "scan_needs_ai", "source_missing"];

/**
 * Background course generation (issue #31). Each step retries on its own;
 * problems with the file stop at once. After the last retry the job is marked
 * failed so T2 can offer "Try again".
 */
export const generateCourse = inngest.createFunction(
  {
    id: "generate-course",
    triggers: [{ event: GENERATE_EVENT }],
    retries: 2,
    // A teacher's courses build two at a time; the rest wait ("Queued").
    concurrency: [{ key: "event.data.teacherId", limit: 2 }],
    onFailure: async ({ event, error }) => {
      const data = event.data.event.data as GenerationEvent;
      const key = keys.find((k) => error?.message === k);
      await failJob(data.jobId, key ? new JobError(key) : error);
    },
  },
  async ({ event, step }) => {
    const data = event.data as GenerationEvent & { teacherId: string };
    await runGeneration(data, {
      run: (name, fn) =>
        step.run(name, async () => {
          try {
            return await fn();
          } catch (e) {
            // A wrong or unreadable file won't fix itself: don't retry.
            if (isPermanent(e)) throw new NonRetriableError((e as Error).message, { cause: e });
            throw e;
          }
        }) as never,
    });
  },
);

export const functions = [generateCourse];
