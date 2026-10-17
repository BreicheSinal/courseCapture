Sheet is a panel that slides in from the edge of the screen to show details while the page behind it stays readable and usable, such as a student's progress opened from the roster.

It follows the structure of Vercel's Geist sheet (a trigger, a panel with header, body and footer, a side, a non-modal default, an explicit close control), restyled with CourseCapture tokens and written in sentence case.

Render a `cc-sheet` (`role="dialog"`, `aria-labelledby`) with `cc-sheet__head` (title, optional description and a close IconButton), `cc-sheet__body` and an optional `cc-sheet__foot`. It sits on the right by default; add `cc-sheet--left` for the left edge. Set `--sheet-w` for the width.

- **When.** Persistent, related context: a student's progress, a course's details, row inspection. Keep it non-modal (no scrim) so the page stays interactive. For a blocking decision use Modal; for a delete use DestructiveActionModal.
- **Title.** The entity's name ("Omar Khalil"). Do not repeat the page header inside it.
- **Close.** An explicit close button with `aria-label="Close"` and Escape. A click outside does not close it.
- **Focus.** Move focus in on open, keep it inside while it is open, and return it to the trigger on close.
- **Side.** Choose the side by where the trigger lives and keep it the same within a session.
- **Phones.** There the sheet fills the width; for a quick action on a phone use a Modal, which becomes a bottom sheet.
- **Actions.** Verb and noun buttons in the footer: "Save notes".
