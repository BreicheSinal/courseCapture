# AI features

All AI calls go from server code only (`src/lib/ai/`, `src/jobs/`) through one **provider-agnostic AI layer**, so the app is not tied to one vendor. Prompts live as text in `ai/prompts/` so they can be reviewed and versioned.

## Providers
- The layer is built on the **Vercel AI SDK**, which gives one interface (`generateObject`, `generateText`, `streamText`, image input) over many providers.
- **Anthropic (Claude) is the default.** OpenAI, Google Gemini, Mistral, or any OpenAI-compatible endpoint (Azure, OpenRouter, a self-hosted model) can be used by changing environment variables only — no code changes.
- App code never imports a vendor SDK directly. It calls `ai.generateCourse()`, `ai.transcribe()`, `ai.drawVisual()`, `ai.tutor()` in `src/lib/ai/`; adapters in `src/lib/ai/providers/` map these to each vendor.
- Optional: a different provider per task (e.g. one for generation, a cheaper one for the tutor) via per-task overrides.
- **A key alone is enough.** With `AI_PROVIDER` empty, the provider is worked out from the key: `AIza…` → Google, `sk-ant-…` → Anthropic, other `sk-…` → OpenAI, anything else → Anthropic. Each provider has default models, so `AI_MODEL_*` is optional: Anthropic `claude-sonnet-5-5` / `claude-haiku-5-5`, Google `gemini-3.8-flash` / `gemini-3.5-flash-lite`, OpenAI `gpt-6-astra` / `gpt-6-luna`, Mistral `mistral-large-latest` / `mistral-small-latest`. OpenAI-compatible endpoints need `AI_MODEL_DEFAULT` and `AI_BASE_URL`.
- **Gemini thinks before it answers**, and those tokens come out of the same output budget. Diagrams and scans ask it to think little (`thinkingLevel: "low"`); course writing keeps the model's default.
- `AI_PROVIDER=fake` writes canned, deterministic content with no network calls, for local work and end-to-end tests. It refuses to start when `VERCEL_ENV=production`.
- With no API key set, generation still works: the **basic splitter** (`src/lib/generation/fallback.ts`) turns the text into modules without flashcards, quizzes or diagrams, and T1 says so. Reading scanned PDFs and redrawing diagrams need a model.
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
| Course generation | `ai/prompts/generate-course.md` | default | Generation job, per chunk | JSON validated with a Zod schema (`src/lib/ai/schemas.ts`) |
| Scanned PDF reading | `ai/prompts/transcribe-scan.md` | vision (`AI_MODEL_VISION`, else default) | Generation job | Plain text |
| Diagrams | `ai/prompts/draw-visual.md` | default | Generation job (batches of 4), and T4 "Regenerate diagram" (server action) | One `<svg>`, sanitised |
| Ask Claude tutor | `ai/prompts/tutor.md` | quick | Route handler, streamed | Short text |

Provider and model names come from environment variables, never hard-coded. Prompts are written to work across providers (plain instructions, JSON shape described in text, no vendor-specific syntax); prompt caching is used where the provider supports it.

## Running the job
- "Generate course" (T1) creates the course and a `generation_jobs` row, then queues the job (`src/lib/generation/queue.ts`). T2 polls the row.
- **With Inngest** (`INNGEST_EVENT_KEY` set, or `INNGEST_DEV=1` locally) the job runs in the background at `/api/inngest`, one step per chunk and per diagram batch, so a failed step retries on its own.
- **Without Inngest** it runs straight after the response (`after()` in `next/server`), inside the page's time limit and without step retries. Fine for previews and small sites; set up Inngest in production.
- Steps: read the file (scans → vision model, first 8 pages) → write modules chunk by chunk → draw diagrams → done. The source file is deleted when the job finishes and kept after a failure, so "Try again" can reuse it.
- The job writes modules, quiz answers and diagrams with the service role (`src/lib/supabase/service.ts`, server only).

## Reliability
- Structured output: ask for JSON, validate with Zod, retry once with the validation error; then fall back to the basic splitter for that chunk.
- Diagrams: a reply that's cut off, or has no SVG or alt text, is asked for once more. Labels may come bolded or the SVG fenced (models differ); a missing `ALT:` falls back to the caption. A diagram that still fails is left out, and the reason is logged as `[diagram] job … module N: no_svg | no_alt | cut_off | unsafe | rejected | rate_limited | other`. The log has no course text.
- A refused key (401/403) is not silent: the job still finishes with the basic splitter, sets `error = "ai_rejected"`, and T3 tells the teacher to ask the site admin to check the AI settings. "Regenerate diagram" says the same.
- Rate limits (429) are retried with backoff by the AI SDK (2 retries) before a call counts as failed.
- Inngest steps make each chunk retryable on its own; partial modules are kept.
- Timeouts and clear messages on T2 ("Still working on part 2 of 4").

## Safety
- Source text and student questions are treated as **data**: wrapped in clear delimiters, and prompts say not to follow instructions found inside them.
- Every SVG goes through `src/lib/svg/sanitize` before storage and again before render.
- The tutor only gets the current module as context and declines unrelated requests politely.

## Cost controls
- Daily limits per person, counted per UTC day in `ai_usage` by `claim_ai_use()` before the action starts, configurable by env:
  `AI_DAILY_GENERATIONS_PER_TEACHER` (default 20), `AI_DAILY_DIAGRAMS_PER_TEACHER` (redraws, default 100), `AI_DAILY_TUTOR_QUESTIONS_PER_STUDENT` (default 30, stage 6).
  A generation counts once, even if the basic splitter ends up writing it; "Try again" after a failure doesn't count again. Diagrams drawn during generation are part of that generation.
- Prompt caching for the fixed instruction part of each prompt.
- Max 4 chunks × ~12k characters per course; max 8 scanned pages.

## Privacy
- Uploaded files go to a private bucket through a signed upload URL and are deleted after generation; only the file name is kept.
- No student personal data is sent to the API — only module text and the question.
