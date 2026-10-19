import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { describeIssues, extractJson, generatedChunk, parseVisual, readVisual } = await import("@/lib/ai/schemas");
const { modelChoice, isAiConfigured, dailyLimits, detectProvider } = await import("@/lib/ai/config");
const { taskOptions } = await import("@/lib/ai/providers");
const { APICallError } = await import("ai");
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
    expect(parseVisual("<svg></svg>")).toBeNull();
    expect(parseVisual("no picture")).toBeNull();
  });

  it("reads diagrams the way Gemini formats them (#62)", () => {
    const fenced = '```svg\n<svg viewBox="0 0 1 1"></svg>\n```\n**CAPTION:** Light in\n**ALT:** A box with an arrow.';
    expect(readVisual(fenced)).toEqual({
      ok: true,
      data: { svg: '<svg viewBox="0 0 1 1"></svg>', caption: "Light in", alt: "A box with an arrow." },
    });
    expect(parseVisual("<svg></svg>\n- Caption - Light\n- Alt: A sun.")).toMatchObject({
      caption: "Light",
      alt: "A sun.",
    });
  });

  it("uses the caption when ALT is missing, and says why a reply can't be used", () => {
    expect(readVisual("<svg></svg>\nCAPTION: The light reactions")).toMatchObject({
      ok: true,
      data: { alt: "The light reactions" },
    });
    expect(readVisual("<svg></svg>")).toEqual({ ok: false, miss: "no_alt" });
    expect(readVisual('<svg viewBox="0 0 400 220"><rect')).toEqual({ ok: false, miss: "cut_off" });
    expect(readVisual("Sorry, I can't draw that.")).toEqual({ ok: false, miss: "no_svg" });
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
    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    expect(() => modelChoice("generate")).toThrow(/AI_MODEL_DEFAULT/);
    vi.stubEnv("AI_PROVIDER", "openai-compatible");
    vi.stubEnv("AI_MODEL_DEFAULT", "m");
    expect(() => modelChoice("generate")).toThrow(/AI_BASE_URL/);
    vi.stubEnv("AI_PROVIDER", "nope");
    expect(() => modelChoice("generate")).toThrow(/Unknown/);
  });

  it("works out the provider from the key when AI_PROVIDER is empty (#62)", () => {
    expect(detectProvider("AIzaSyExample")).toBe("google");
    expect(detectProvider("sk-ant-api03-x")).toBe("anthropic");
    expect(detectProvider("sk-proj-x")).toBe("openai");
    expect(detectProvider("something-else")).toBe("anthropic");
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("AI_MODEL_DEFAULT", "");
    vi.stubEnv("AI_MODEL_QUICK", "");
    vi.stubEnv("AI_API_KEY", "AIzaSyExample");
    expect(modelChoice("generate")).toMatchObject({ provider: "google", modelId: "gemini-3.8-flash" });
    expect(modelChoice("tutor").modelId).toBe("gemini-3.5-flash-lite");
    vi.stubEnv("AI_PROVIDER", "anthropic"); // an explicit setting wins
    expect(modelChoice("generate").provider).toBe("anthropic");
  });

  it("has default models for Google, OpenAI and Mistral, so a key is enough", () => {
    vi.stubEnv("AI_API_KEY", "k");
    vi.stubEnv("AI_MODEL_DEFAULT", "");
    vi.stubEnv("AI_MODEL_QUICK", "");
    for (const [provider, model] of [
      ["google", "gemini-3.8-flash"],
      ["openai", "gpt-6-astra"],
      ["mistral", "mistral-large-latest"],
    ]) {
      vi.stubEnv("AI_PROVIDER", provider);
      expect(modelChoice("generate").modelId).toBe(model);
    }
  });

  it("asks Gemini to think little on diagrams and scans, and leaves course writing alone", () => {
    expect(taskOptions("google", "visual")).toEqual({ google: { thinkingConfig: { thinkingLevel: "low" } } });
    expect(taskOptions("google", "transcribe")).toBeDefined();
    expect(taskOptions("google", "generate")).toBeUndefined();
    expect(taskOptions("anthropic", "visual")).toBeUndefined();
  });

  it("tells a refused key and a rate limit apart from other failures", () => {
    const err = (statusCode: number) =>
      new APICallError({ message: "x", url: "u", requestBodyValues: {}, statusCode, isRetryable: false });
    expect(ai.aiFailureKind(err(401))).toBe("rejected");
    expect(ai.aiFailureKind(err(403))).toBe("rejected");
    expect(ai.aiFailureKind(err(429))).toBe("rate_limited");
    expect(ai.aiFailureKind(err(500))).toBe("other");
    expect(ai.aiFailureKind(new Error("x"))).toBe("other");
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
      ai.generateCourseChunk({
        text: "[[fail]] text",
        language: "en",
        level: "beginner",
        moduleRange: "3–7",
        notes: "",
        teacherLanguage: "en",
      }),
    ).rejects.toThrow();
  });
});

describe("diagram retries (#62)", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/ai/providers");
    vi.resetModules();
  });

  /** An AI layer whose diagram model gives these replies in turn (each with its finish reason). */
  async function layerReplying(replies: { text: string; finish: "stop" | "length" }[]) {
    const { MockLanguageModelV4 } = await import("ai/test");
    const real = await import("@/lib/ai/providers");
    const prompts: string[] = [];
    let call = 0;
    const model = new MockLanguageModelV4({
      provider: "google",
      modelId: "gemini-test",
      doGenerate: async (options) => {
        prompts.push(JSON.stringify(options.prompt));
        const r = replies[Math.min(call++, replies.length - 1)];
        return {
          content: [{ type: "text", text: r.text }],
          finishReason: { unified: r.finish, raw: undefined },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 20, text: 20, reasoning: 0 },
          },
          warnings: [],
        };
      },
    });
    vi.doMock("@/lib/ai/providers", () => ({
      ...real,
      resolveModel: () => ({ provider: "google", modelId: "gemini-test", apiKey: "k", model, task: "visual" }),
    }));
    vi.resetModules();
    const layer = await import("@/lib/ai");
    return { layer, prompts, calls: () => call };
  }

  const req = { language: "en", heading: "Light", body: "Plants use light." };

  it("asks again when the reply was cut off, and keeps the second answer", async () => {
    const { layer, prompts, calls } = await layerReplying([
      { text: '<svg viewBox="0 0 400 220"><rect width="10"', finish: "length" },
      { text: '<svg viewBox="0 0 400 220"></svg>\n**CAPTION:** Light in\n**ALT:** A sun over a leaf.', finish: "stop" },
    ]);
    const out = await layer.drawVisual(req);
    expect(calls()).toBe(2);
    expect(prompts[1]).toMatch(/cut off/);
    expect(out.data).toMatchObject({ alt: "A sun over a leaf." });
    expect(out.usage).toEqual({ input: 20, output: 40 });
  });

  it("gives up after two tries and says why", async () => {
    const { layer, calls } = await layerReplying([{ text: "I can't draw that.", finish: "stop" }]);
    const out = await layer.drawVisual(req);
    expect(calls()).toBe(2);
    expect(out).toMatchObject({ data: null, miss: "no_svg" });
  });
});
