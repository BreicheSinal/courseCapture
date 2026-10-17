StatusDot is a small dot that shows where a course is in its build, from queued to ready.

It follows the structure of Vercel's Geist status dot (a state, an optional label and an accessible title built from the state), restyled with CourseCapture tokens and written in sentence case. Geist uses it for deployments; here it covers the lifecycle of a course Claude is building from an upload.

Render a `cc-dot` with a state class and a `cc-dot__mark`. Add a `cc-dot__label` with the state word when the dot stands alone.

- **States.** `cc-dot--queued` (hollow ring, waiting to start), `cc-dot--building` (blue dot with a pulse, "Generating"), `cc-dot--ready` (green, "Ready"), `cc-dot--error` (red, "Failed"), `cc-dot--canceled` (dashed ring, "Canceled").
- **Not color alone.** Each state has its own word and its own shape or motion: ring, pulse, solid, dashed ring. Always give the dot an accessible name built from what it describes and the state: `aria-label="Photosynthesis: Generating"`, or a visible label.
- **Label.** Use the label when the dot stands alone. If the dot sits next to text that already names the state, mark the dot `aria-hidden="true"` so it is not announced twice. Do not wrap it in text like "Status:".
- **Motion.** The pulse runs only while the course is generating and stops at ready, failed or canceled; it also stops under reduced motion. Do not add a separate spinner. Change the dot only when the state really changes, not on every poll.
- **Time.** The dot shows state, not duration. Pair it with a date such as "Oct 16" when timing matters.
- **Not for.** Student roles, classes or quiz results: use a Badge. For a known number of steps, use a progress bar.
