Notice is a short message inside a screen: an info box tinted in `accent-soft`, or a warning box outlined in `warning`.

Render a `p.cc-notice` (or `div`) with a 17px stroke icon first and the text after it; add `cc-notice--warning` for warnings. Use `role="status"` when it appears after an action, `role="alert"` for an error that needs attention now.

- **Info.** Context the reader should know before acting: "Courses are written by AI. Check each module before assigning it."
- **Warning.** Something that changes what will happen: "You're offline. Modules you've opened can still be read."
- **Copy.** One or two sentences that say what to do next. The icon is never the only cue; the words carry it.
- **Not for.** Field errors (Field shows those) or confirmations after an action (Toast).
