Switch is a segmented control for choosing one of two or three related views or modes.

It follows the structure of Vercel's Geist switch (a segmented selector, small, default and large sizes, one default selection, a visible label on every option), restyled with CourseCapture tokens and written in sentence case. For an on and off setting, use Toggle.

Render a `div.cc-seg` with `role="radiogroup"` and an `aria-label`. Each option is a `label.cc-seg__opt` holding a visually hidden `input type="radio"` that shares a `name`, and a `span` with the label.

- **When.** Two or three options that switch between views of the same content, such as "Student view" and "Teacher view", or "Cards" and "List". Four or more, or longer labels: use Tabs or Select.
- **Default.** Exactly one option is checked from the start.
- **Labels.** One or two words, parallel in form. Options take equal width, so size for the longest label to avoid resizing.
- **Sizes.** `cc-seg--sm`, default, and `cc-seg--lg`. `cc-seg--block` makes it fill its container.
- **Icons.** An icon may sit before the label. If an option is icon only, keep the label for screen readers and add a Tooltip.
- **Keyboard.** Arrow keys move and select; Tab leaves the group.
- **Not for.** Moving between pages (use Tabs or links) or on and off (use Toggle).
