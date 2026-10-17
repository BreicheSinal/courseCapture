CourseCard shows a course's title, class, due date and progress, as a tappable card for students and a card with icon buttons for teachers.

**Student card.** Provide the course title, the class name, a completed count and total, an optional due date, and an `onClick` that opens the course.

- Put the title in `headline` weight and the meta line ("Biology · 3/9 · due Nov 4") in `ink-muted`.
- Show progress with `cc-progress`; set the fill width to completed divided by total.
- Add a warning badge reading "Overdue" when the due date has passed and modules remain. When every module is complete, add a success badge reading "Complete".
- The whole card is the one control, so do not nest buttons inside it. The border turns blue on hover.

**Teacher card.** Use `cc-card cc-card--stack` as a plain container, not a button. Provide the title, a meta line such as "9 modules · due Nov 4", and two IconButtons in `cc-course__actions`: preview (eye, `aria-label="Preview course"`) and delete (trash, `aria-label="Delete course"`). Delete confirms in place with "Sure?".

- Stack cards with `space-4` between them.
