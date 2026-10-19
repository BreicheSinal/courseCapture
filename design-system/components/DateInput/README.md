DateInput is the browser's own date field styled as an Input, for due dates.

Render an `input type="date"` with `cc-input` inside a Field, with a visible label ("Due date"). Set `min` to today for new dates.

- **Why native.** The browser's picker is accessible, uses the viewer's language and calendar, works right to left, and on phones opens the system's own picker. Don't build a custom calendar.
- **Disabled.** When the date belongs to a choice that isn't made (a class that isn't ticked), disable it; the field dims and can't be focused.
- **Showing a date elsewhere.** Format it with `Intl`, as "Nov 4".
- **Empty.** "No due date" is a valid choice: leave the field empty and say so in the hint.
