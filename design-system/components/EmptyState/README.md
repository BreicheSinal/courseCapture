EmptyState explains a view that has nothing in it yet, with an icon, a short title, one line of guidance and at most one main action.

It follows the structure of Vercel's Geist empty state (icon, title, description, actions; blank-slate, informational, no-data and error cases), restyled with CourseCapture tokens and written in sentence case.

Provide an icon, a title that states the condition, a description that adds the next step, and, where there is a next step, an action.

- **Blank slate.** First-run views such as a teacher with no classes. Title: "Create your first class". Description names what creates the first item. One primary Button with a verb and a noun: "Create class".
- **Informational.** A view that is empty until someone else acts, such as a student with nothing assigned. Say what has to happen and who does it: "Nothing assigned yet" and "Ask your teacher for a join code, then join the class above."
- **Inline.** Add `cc-empty--inline` for a section inside a card, such as an empty roster or announcement list. The icon sits to the left, the text is smaller, and the actions align left.
- **Error.** Add `cc-empty--error` when loading failed. Say what failed and what to try ("Couldn't load your classes", "Check your connection and try again") and give a "Try again" Button.
- **Writing.** Do not repeat the title in the description. Avoid vague labels such as "Get started", "Continue" or "OK". Offer a second action only when there are two real paths, for example a ghost "Learn more" link.
- **Behavior.** Make actions real buttons or links. If the empty state appears after a list updates, put it in an `aria-live="polite"` region so screen readers announce it.
- **Do not** use an empty state for a warning that should stay on a page after data loads, and do not use a toast for something that is really an empty view.
