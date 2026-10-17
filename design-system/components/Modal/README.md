Modal is a window over the page for a decision or short task that must be finished first, such as inviting a co-teacher or editing a due date.

It follows the structure of Vercel's Geist modal (title and subtitle, body, an inset section, actions, a sticky layout for long content, a bottom sheet on phones), restyled with CourseCapture tokens and written in sentence case. It shares its `cc-dialog` parts with DestructiveActionModal, which adds the delete confirmation.

Render a `cc-dialog` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) inside a `cc-scrim`. Inside it: `cc-dialog__title`, an optional `cc-dialog__sub`, the content, an optional `cc-dialog__inset`, and `cc-dialog__actions`.

- **When.** A decision that blocks the page. Persistent context where the page should stay readable goes in a Sheet. A routine create flow with its own page does not belong in a modal.
- **Title.** A statement, not a question: "Invite a co-teacher". Body of one to three sentences, consequence first.
- **Actions.** Cancel is a ghost or secondary Button labelled "Cancel". The primary button is a verb and a noun that matches the title: "Send invite". Use "Done" for a modal that only informs. Never a bare "OK".
- **Focus.** Move focus into the modal on open (the first field or the safest button), keep it trapped, and return it to the trigger on close. After an error keep focus inside; after success return it.
- **Dismiss.** Escape and a click outside close a modal with nothing typed. If the person has unsaved input, do not dismiss on outside click.
- **Long content.** Use `cc-dialog--sticky` with `cc-dialog__head`, `cc-dialog__body` and `cc-dialog__actions`. The header and actions stay put and the body scrolls. Set `--modal-h` for the height.
- **Phones.** At 480px and narrower the modal becomes a bottom sheet that sticks to the screen's bottom edge.
- **Toasts** appear above the modal and stay usable without closing it.
