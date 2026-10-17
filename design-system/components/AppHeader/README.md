AppHeader is the top bar of every screen: the CourseCapture wordmark on the left and the signed-in person on the right.

Provide the person's name and role. Build the right side from `cc-chip`: an avatar with the first initial, the name, and a role Badge ("Teacher" or "Student").

- Set the wordmark as plain type with "Capture" in `accent-text`. There is no logo mark; do not draw one.
- Keep the header on `bg`, not on a card, with `space-4` side gutters and `space-6` below it.
- Truncate a long name rather than wrapping the chip. Let the header wrap to two lines on very narrow screens instead of shrinking the wordmark.
- Add a ghost "switch" button after the chip only in the owner's testing view.
