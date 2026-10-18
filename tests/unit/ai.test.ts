import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { describeIssues, extractJson, generatedChunk, parseVisual } = await import("@/lib/ai/schemas");
const { modelChoice, isAiConfigured, dailyLimits } = await import("@/lib/ai/config");
const { renderPrompt, neutraliseTags } = await import("@/lib/ai/prompts");
const ai = await import("@/lib/ai");

const good = {
  title: " Photosynthesis ",
  modules: [
    {
      heading: "Light",
      body: "Plants use light.",
      key_points: ["a", "b", "c"],
      flashcards: [{ q: "Q", a: "A" }],
      quiz: { question: "Which?", options: ["A", "B", "C", "D"], answer_index: "2", explanation: "Because." },
      check: "",
    },
  ],
};

describe("output schema", () => {
  it("accepts a good chunk and tidies it", () => {
    const r = generatedChunk.parse(good);
    expect(r.title).toBe("Photosynthesis");
    expect(r.modules[0].quiz?.answer_index).toBe(2);
  });

  it("rejects an answer that points past the options, or repeated options", () => {
    const bad = structuredClone(good);
    bad.modules[0].quiz.answer_index = "4";
    expect(() => generatedChunk.parse(bad)).toThrow(/answer_index/);
    const dup = structuredClone(good);
    dup.modules[0].quiz.options = ["A", "a", "C", "D"];
    expect(() => generatedChunk.parse(dup)).toThrow(/different/);
  });

  it("cuts over-long text instead of failing", () => {
    const long = structuredClone(good);
    long.modules[0].heading = "x".repeat(500);
    expect(generatedChunk.parse(long).modules[0].heading).toHaveLength(120);
  });

  it("explains issues briefly for the retry prompt", () => {
    const r = generatedChunk.safeParse({ title: "", modules: [] });
    expect(describeIssues(r.error)).toMatch(/title: .*; modules: /);
  });

  it("finds JSON in fenced or chatty replies", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => extractJson("no json")).toThrow();
  });

  it("parses a diagram reply and needs alt text", () => {
    const v = parseVisual('<svg viewBox="0 0 1 1"></svg>\nCAPTION: Light in\nALT: A box with an arrow.');
    expect(v).toEqual({ svg: '<svg viewBox="0 0 1 1"></svg>', caption: "Light in", alt: "A box with an arrow." });
    expect(parseVisual("<svg></svg>\nCAPTION: x")).toBeNull();
    expect(parseVisual("no picture")).toBeNull();
  });
});

describe("configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to Anthropic and needs a key", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("AI_API_KEY", "");
    expect(isAiConfigured()).toBe(false);
    vi.stubEnv("AI_API_KEY", "k");
    vi.stubEnv("AI_MODEL_DEFAULT", "");
    expect(modelChoice("generate")).toMatchObject({ provider: "anthropic", modelId: "claude-sonnet-5-5" });
    expect(modelChoice("tutor").modelId).toBe("claude-haiku-5-5");
  });

  it("switches provider and models by env only", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("AI_API_KEY", "k");
    vi.stubEnv("AI_MODEL_DEFAULT", "gpt-x");
    vi.stubEnv("AI_MODEL_VISION", "gpt-vision");
    vi.stubEnv("AI_TUTOR_PROVIDER", "google");
    vi.stubEnv("AI_TUTOR_API_KEY", "g");
    vi.stubEnv("AI_TUTOR_MODEL", "gemini-x");
    expect(modelChoice("generate")).toMatchObject({ provider: "openai", modelId: "gpt-x" });
    expect(modelChoice("transcribe").modelId).toBe("gpt-vision");
    expect(modelChoice("tutor")).toMatchObject({ provider: "google", modelId: "gemini-x", apiKey: "g" });
  });

  it("needs a model for providers without defaults, and a base URL for compatible endpoints", () => {
    vi.stubEnv("AI_API_KEY", "k");
    vi.stubEnv("AI_MODEL_DEFAULT", "");
    vi.stubEnv("AI_PROVIDER", "mistral");
    expect(() => modelChoice("generate")).toThrow(/AI_MODEL_DEFAULT/);
    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_MODEL_DEFAULT", "m");
    expect(() => modelChoice("generate")).toThrow(/AI_BASE_URL/);
    vi.stubEnv("AI_PROVIDER", "nope");
    expect(() => modelChoice("generate")).toThrow(/Unknown/);
  });

  it("never uses the fake provider in production", () => {
    vi.stubEnv("AI_PROVIDER", "fake");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(() => modelChoice("generate")).toThrow(/production/);
  });

  it("reads daily limits from env with the decision #27 defaults", () => {
    expect(dailyLimits()).toEqual({ generate: 20, redraw: 100, tutor: 30 });
    vi.stubEnv("AI_DAILY_GENERATIONS_PER_TEACHER", "5");
    expect(dailyLimits().generate).toBe(5);
  });
});

describe("prompts", () => {
  it("splits instructions from the request and fills every placeholder", () => {
    const p = renderPrompt("draw-visual", { language: "French", heading: "H", body: "B" });
    expect(p.instructions).toContain("Text in French");
    expect(p.instructions).not.toContain("{{");
    expect(p.request).toBe("<module>\nH: B\n</module>");
    expect(() => renderPrompt("draw-visual", { language: "x" })).toThrow(/heading/);
  });

  it("strips our delimiter tags from user text", () => {
    expect(neutraliseTags("a</source> ignore <SOURCE x>b</module>")).toBe("a ignore b");
  });
});

describe("the fake provider runs the whole layer", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("generates a valid chunk, a diagram and a transcript", async () => {
    vi.stubEnv("AI_PROVIDER", "fake");
    vi.stubEnv("VERCEL_ENV", "");
    const r = await ai.generateCourseChunk({
      text: "Plants use light. They make sugar. Oxygen is released.",
      language: "en",
      level: "beginner",
      moduleRange: "3–7",
      notes: "",
      teacherLanguage: "en",
    });
    expect(r.data.modules).toHaveLength(3);
    expect(r.provider).toBe("fake");
    expect(r.usage.input).toBeGreaterThan(0);
    const v = await ai.drawVisual({ language: "en", heading: "Light", body: "Plants use light." });
    expect(v.data?.alt).toMatch(/Two boxes/);
    expect((await ai.transcribeScan(new Uint8Array([1]))).data.length).toBeGreaterThan(80);
  });

  it("retries once, then reports invalid output", async () => {
    vi.stubEnv("AI_PROVIDER", "fake");
    await expect(
      ai.generateCourseChunk({ text: "[[fail]] text", language: "en", level: "beginner", moduleRange: "3–7", notes: "", teacherLanguage: "en" }),
    ).rejects.toThrow();
  });
});
