Tooltip is a small label that appears on hover or keyboard focus to add context to a control.

It follows the structure of Vercel's Geist tooltip (four sides, opens on hover and focus after a short delay, Escape closes it, an arrow, rich inline content), restyled with CourseCapture tokens and written in sentence case.

Wrap the trigger in `span.cc-tip` with a side class (`cc-tip--top`, `--bottom`, `--left` or `--right`) and add a `span.cc-tip__bubble` with `role="tooltip"` and an `id` that the trigger names in `aria-describedby`.

- **Content.** Short. Explain why something exists or what limit applies, not what the control is. Do not repeat the visible label or describe the interaction. For example, on a disabled button: "Choose a class first."
- **Icon-only triggers** still need their own `aria-label` that names the action. The tooltip adds context; it does not replace the name.
- **Timing.** About 150ms before it appears, to avoid flicker. It stays open while the pointer is over the trigger or focus is on it, and Escape closes it.
- **Not on a labeled input.** Do not wrap an input that has its own label; it would add a hidden second label. Put help on a sibling icon button.
- **Primary actions** never live only in a tooltip. Touch screens cannot hover.
- **Shortcut.** A `kbd` inside the bubble shows a key hint.
- **Not for.** Long content or an entity preview: use a Sheet or a page.
