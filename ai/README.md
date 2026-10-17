# AI prompts

Every prompt the app sends to the AI provider lives here as a Markdown file, so prompt changes are reviewed in PRs like code.

| File | Used by | Variables |
|---|---|---|
| `prompts/generate-course.md` | Course generation job, once per chunk | `{{language}}`, `{{level}}`, `{{module_range}}`, `{{source_text}}` |
| `prompts/transcribe-scan.md` | Scanned PDF pages (images attached) | — |
| `prompts/draw-visual.md` | "Regenerate visual" on T4 | `{{language}}`, `{{heading}}`, `{{body}}` |
| `prompts/tutor.md` | Ask Claude (S5) | `{{language}}`, `{{heading}}`, `{{body}}`, `{{key_points}}`, `{{question}}` |

Conventions:
- Text above `---8<---` is the cacheable system part; text below is the per-request user part.
- User-provided content is always wrapped in tags (`<source>`, `<question>`) and treated as data.
- Output shapes are enforced in code with Zod schemas in `src/lib/ai/schemas`.
- See `docs/ai.md` for models, limits and safety.
