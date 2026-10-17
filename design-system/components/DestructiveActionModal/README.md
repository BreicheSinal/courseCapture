DestructiveActionModal asks for explicit confirmation before an action that cannot be undone, such as deleting a class or a course.

It follows the structure of Vercel's Geist destructive action modal (verb-and-noun title, consequence text, type-to-confirm input, Cancel and a destructive button), restyled with CourseCapture tokens and written in sentence case.

Render a `cc-dialog` (`role="alertdialog"`, `aria-labelledby`, `aria-describedby`) inside a `cc-scrim` that covers the page.

- **Title.** A verb and a noun that matches the button: "Delete Biology 101".
- **Description.** Name the resource and what is lost: "This removes the class, its 12 students' progress and quiz scores."
- **Note.** Use `cc-dialog__note` with the warning icon and the words "This can't be undone." when that is true. The note carries a word, not color alone.
- **Type to confirm.** A Field asks the person to type the resource name, focused when the dialog opens. The confirm button stays `disabled` until the text matches exactly. Enter submits only when it matches.
- **Actions.** A secondary "Cancel" and a `cc-btn--danger` button labelled like the title ("Delete class"). Cancel is first in the focus order.
- **Loading and errors.** While deleting, keep the dialog open, disable both buttons and change the label to "Deleting…". On failure, show the message inline in `cc-field__error` and let the person try again.
- **Dismiss.** Escape, Cancel and a click outside close it. After success, return focus to the control that opened it, or to the page heading if that control is gone.
- **Not for** routine confirmations. For reversible actions, use a Toast with an Undo action instead.
