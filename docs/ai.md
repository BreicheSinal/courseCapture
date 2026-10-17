# AI features

All AI calls go from server code only (`src/lib/ai/`, `src/jobs/`) through one **provider-agnostic AI layer**, so the app is not tied to one vendor. Prompts live as text in `ai/prompts/` so they can be reviewed and versioned.

## Providers
- The layer is built on the **Vercel AI SDK**, which gives one interface (`generateObject`, `generateText`, `streamText`, image input) over many providers.
- **Anthropic (Claude) is the default.** OpenAI, Google Gemini, Mistral, or any OpenAI-compatible endpoint (Azure, OpenRouter, a self-hosted model) can be used by changing environment variables only — no code changes.
- App code never imports a vendor SDK directly. It calls `ai.generateCourse()`, `ai.transcribe()`, `ai.drawVisual()`, `ai.tutor()` in `src/lib/ai/`; adapters in `src/lib/ai/providers/` map these to each vendor.
- Optional: a different provider per task (e.g. one for generation, a cheaper one for the tutor) via per-task overrides.
- Requirements a provider must meet: JSON/structured output, image input (for scanned PDFs), streaming (for the tutor). If the chosen default model lacks vision, set `AI_MODEL_VISION` to one that has it.

```
AI_PROVIDER=anthropic          # anthropic | openai | google | mistral | openai-compatible
AI_API_KEY=…                   # key for AI_PROVIDER
AI_BASE_URL=                   # only for openai-compatible / gateways
AI_MODEL_DEFAULT=…             # generation + diagrams
AI_MODEL_QUICK=…               # tutor
AI_MODEL_VISION=               # optional; defaults to AI_MODEL_DEFAULT
# Optional per-task overrides, e.g.:
AI_TUTOR_PROVIDER=  AI_TUTOR_API_KEY=  AI_TUTOR_MODEL=
```

| Feature | Prompt | Model tier | Where it runs | Output |
|---|---|---|---|---|
| Course generation | `ai/prompts/generate-course.md` | default | Inngest job, per chunk | JSON validated with a Zod schema |
| Scanned PDF reading | `ai/prompts/transcribe-scan.md` | default (vision) | Inngest job | Plain text |
| Regenerate diagram | `ai/prompts/draw-visual.md` | default | Server action | One `<svg>`, sanitised |
| Ask Claude tutor | `ai/prompts/tutor.md` | quick | Route handler, streamed | Short text |

Provider and model names come from environment variables, never hard-coded. Prompts are written to work across providers (plain instructions, JSON shape described in text, no vendor-specific syntax); prompt caching is used where the provider supports it.

## Reliability
- Structured output: ask for JSON, validate with Zod, retry once with the validation error; then fall back to the basic splitter for that chunk.
- Inngest steps make each chunk retryable on its own; partial modules are kept.
- Timeouts and clear messages on T2 ("Still working on part 2 of 4").

## Safety
- Source text and student questions are treated as **data**: wrapped in clear delimiters, and prompts say not to follow instructions found inside them.
- Every SVG goes through `src/lib/svg/sanitize` before storage and again before render.
- The tutor only gets the current module as context and declines unrelated requests politely.

## Cost controls
- Daily limits per teacher (generations, diagrams) and per student (tutor questions), stored in `ai_usage`, configurable by env.
- Prompt caching for the fixed instruction part of each prompt.
- Max 4 chunks × ~12k characters per course; max 8 scanned pages.

## Privacy
- Uploaded files go to a private bucket and are deleted after generation unless kept.
- No student personal data is sent to the API — only module text and the question.
