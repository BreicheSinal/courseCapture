Entity is one row in a list of things, such as a class, a student, a course or a file: something on the left, a title and description, and one or two actions on the right.

It follows the structure of Vercel's Geist entity (left column, content, right column, list and skeleton variants), restyled with CourseCapture tokens and written in sentence case.

Wrap rows in `cc-entities`. Each `cc-entity` holds a `cc-entity__lead` (an Avatar, an icon or a checkbox), a `cc-entity__body` with `cc-entity__title` and `cc-entity__desc`, and a `cc-entity__trail`.

- **Left.** An Avatar for people, an icon for files and courses, a checkbox for selectable lists. A checkbox needs an `aria-label` that names the row.
- **Content.** The title says what it is; the description gives one fact such as "12 students · due Nov 4". Both truncate on one line.
- **Right.** At most one or two things: a Badge for status, a Button, or an IconButton. Name actions with a verb and a noun ("Copy join code"). With more than two actions, use one IconButton that opens a Menu.
- **Interactive rows.** If the whole row opens something, render it as a `button` or `a` with the `cc-entity` class; it gains a hover surface and a focus ring. Do not nest buttons inside it; put actions in a plain `div` row instead.
- **Loading.** Use Skeleton shapes in the same slots, so the list keeps its height.
- **Use for** lists with a single kind of item. For a rich tappable tile, use CourseCard; for the roster with progress, use Table.
