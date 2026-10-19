import "server-only";

/**
 * AI settings from environment variables only (docs/ai.md). Nothing here is
 * hard-coded to one vendor: AI_PROVIDER picks the adapter, AI_MODEL_* pick
 * models. Anthropic is the default provider.
 */
export const providers = ["anthropic", "openai", "google", "mistral", "openai-compatible", "fake"] as const;
export type ProviderName = (typeof providers)[number];

/** What a model call is for. Each task can use a different model tier. */
export type AiTask = "generate" | "transcribe" | "visual" | "tutor";

export type ModelChoice = { provider: ProviderName; modelId: string; apiKey: string; baseUrl?: string };

/**
 * Sensible defaults when AI_MODEL_* is empty, per provider and tier, so a key
 * alone is enough. Each vendor's own recommended default and efficient model
 * (docs/ai.md). openai-compatible endpoints have no defaults: name the model.
 */
const defaults: Partial<Record<ProviderName, { default: string; quick: string }>> = {
  anthropic: { default: "claude-sonnet-5-5", quick: "claude-haiku-5-5" },
  google: { default: "gemini-3.8-flash", quick: "gemini-3.5-flash-lite" },
  openai: { default: "gpt-6-astra", quick: "gpt-6-luna" },
  mistral: { default: "mistral-large-latest", quick: "mistral-small-latest" },
  fake: { default: "fake-default", quick: "fake-quick" },
};

/**
 * The provider a key belongs to, from its prefix, for when AI_PROVIDER is empty.
 * Google keys start "AIza", Anthropic "sk-ant-", OpenAI "sk-" (checked after
 * Anthropic). Anything else stays on the default, Anthropic.
 */
export function detectProvider(apiKey: string): ProviderName {
  if (apiKey.startsWith("AIza")) return "google";
  if (apiKey.startsWith("sk-ant-")) return "anthropic";
  if (apiKey.startsWith("sk-")) return "openai";
  return "anthropic";
}

const env = (name: string) => (process.env[name] ?? "").trim();

function providerName(raw: string, apiKey: string): ProviderName {
  const name = (raw || detectProvider(apiKey)).toLowerCase();
  if (!(providers as readonly string[]).includes(name)) throw new AiConfigError(`Unknown AI_PROVIDER "${raw}".`);
  // The fake provider writes canned content; it must never run in production.
  if (name === "fake" && process.env.VERCEL_ENV === "production") throw new AiConfigError("AI_PROVIDER=fake isn't allowed in production.");
  return name as ProviderName;
}

export class AiConfigError extends Error {
  readonly code = "ai_not_configured";
}

/** The provider and model for a task, or throws AiConfigError when something required is missing. */
export function modelChoice(task: AiTask): ModelChoice {
  const tutor = task === "tutor";
  const apiKey = (tutor && env("AI_TUTOR_API_KEY")) || env("AI_API_KEY");
  const provider = providerName((tutor && env("AI_TUTOR_PROVIDER")) || env("AI_PROVIDER"), apiKey);
  if (!apiKey && provider !== "fake") throw new AiConfigError("Set AI_API_KEY (docs/ai.md).");

  const fallback = defaults[provider];
  const base = env("AI_MODEL_DEFAULT") || fallback?.default || "";
  const modelId =
    task === "tutor"
      ? env("AI_TUTOR_MODEL") || env("AI_MODEL_QUICK") || fallback?.quick || base
      : task === "transcribe"
        ? env("AI_MODEL_VISION") || base
        : base;
  if (!modelId) throw new AiConfigError(`Set AI_MODEL_DEFAULT for AI_PROVIDER=${provider} (docs/ai.md).`);

  const baseUrl = env("AI_BASE_URL") || undefined;
  if (provider === "openai-compatible" && !baseUrl) throw new AiConfigError("Set AI_BASE_URL for AI_PROVIDER=openai-compatible.");
  return { provider, modelId, apiKey, baseUrl };
}

/** True when generation can call a model (otherwise the job uses the basic splitter). */
export function isAiConfigured(task: AiTask = "generate"): boolean {
  try {
    modelChoice(task);
    return true;
  } catch {
    return false;
  }
}

const int = (name: string, fallback: number) => {
  const n = Number.parseInt(env(name), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Daily limits per person (decision #27), configurable by env. */
export function dailyLimits() {
  return {
    generate: int("AI_DAILY_GENERATIONS_PER_TEACHER", 20),
    redraw: int("AI_DAILY_DIAGRAMS_PER_TEACHER", 100),
    tutor: int("AI_DAILY_TUTOR_QUESTIONS_PER_STUDENT", 30),
  };
}
