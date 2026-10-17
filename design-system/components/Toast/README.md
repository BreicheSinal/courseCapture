Toast is a brief, non-blocking message that appears after an action and goes away on its own, with an optional single action such as Undo.

It follows the same model as Vercel's Geist toast (message, status, one action, undo, stay-until-dismissed), restyled with CourseCapture tokens.

Provide the message and a status. Use the default (no icon) for neutral news, `cc-toast--success` for something that worked, `cc-toast--warning` for a partial result and `cc-toast--error` for a failure. Pick the status by what the person experienced, not by a technical result: a cancelled action is a default toast, not a success.

- **Structure.** Status icon (`cc-toast__icon`, drawn in 18px stroke, `aria-hidden`), message (`cc-toast__body`) and optional `cc-toast__actions`. The icon shape differs per status, so meaning never depends on color.
- **Action.** Add at most one ghost small Button, such as "View". For a reversible step such as deleting an announcement, add "Undo" (use that exact word) and keep the toast up for 5 to 10 seconds.
- **Dismiss.** Default toasts leave after about 4 seconds. A toast that needs a decision stays until dismissed: add an xs IconButton with `aria-label="Dismiss"`.
- **Placement.** Put the stack in `cc-toasts cc-toasts--fixed`, bottom centre, above the safe-area inset. Mark the region `aria-live="polite"` so screen readers announce toasts without interrupting. Use `assertive` only for errors that block the person's flow.
- **Writing.** Use sentence case and no trailing period on a one-sentence message. For completion, write "Noun past-participle": "Code copied", "Course assigned", "Announcement posted"; skip "successfully". Match the verb to the button that triggered it. Write errors as two sentences that end with the next step: "Couldn't read that PDF. Paste the text instead." Use "Couldn't" for something the person can fix and "Failed to" for a system fault.
- **Do not** narrate one long task with several toasts; show only the final result. Do not put navigation in a toast, since it vanishes before a keyboard user can reach it. Do not rely on a toast alone for problems that need follow-up; pair it with a message that stays on the page. Field errors belong under the Field.
