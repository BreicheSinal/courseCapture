IconButton is a square bordered button that holds one stroke icon, for compact actions such as preview, delete, copy and refresh.

Provide one inline SVG icon and an `aria-label` that names the action ("Copy code", "Generate new code", "Delete announcement"). A `title` repeats the label for pointer users.

- Draw icons on a 24px grid with a 1.8px stroke and round caps, in `currentColor`. They show at 17px, or 15px in `cc-iconbtn--xs`.
- Use the 32px size beside course and class titles, and `cc-iconbtn--xs` (28px) inside list rows such as announcements.
- A destructive icon (trash) confirms in place: the first press swaps the icon for the text "Sure?", the second acts.
- Do not use an IconButton for the main action of a view; give that a labeled Button.

- **Touch.** On touch screens (`pointer: coarse`) it grows to the 44px `control-height`; with a mouse it keeps 32px.
