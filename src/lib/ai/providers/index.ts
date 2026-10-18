import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { modelChoice, type AiTask, type ModelChoice } from "../config";
import { fakeModel } from "./fake";

/**
 * One adapter per vendor. App code never imports a vendor SDK; it asks for
 * the model for a task and gets back a Vercel AI SDK model (decision #15).
 */
export type ResolvedModel = ModelChoice & { model: LanguageModel };

export function resolveModel(task: AiTask): ResolvedModel {
  const choice = modelChoice(task);
  const { provider, modelId, apiKey, baseUrl } = choice;
  const model = (() => {
    switch (provider) {
      case "anthropic":
        return createAnthropic({ apiKey, baseURL: baseUrl })(modelId);
      case "openai":
        return createOpenAI({ apiKey, baseURL: baseUrl })(modelId);
      case "google":
        return createGoogleGenerativeAI({ apiKey, baseURL: baseUrl })(modelId);
      case "mistral":
        return createMistral({ apiKey, baseURL: baseUrl })(modelId);
      case "openai-compatible":
        return createOpenAICompatible({ name: "openai-compatible", apiKey, baseURL: baseUrl! })(modelId);
      case "fake":
        return fakeModel(task, modelId);
    }
  })();
  return { ...choice, model };
}

/**
 * Provider options that mark the fixed instruction part of a prompt as
 * cacheable, where the provider supports it (docs/ai.md → Cost controls).
 * Other providers cache automatically or ignore the key.
 */
export function cacheableInstructions(provider: ModelChoice["provider"]) {
  return provider === "anthropic" ? { anthropic: { cacheControl: { type: "ephemeral" as const } } } : undefined;
}
