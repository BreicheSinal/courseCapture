Field pairs a label with a text input, text area or select, plus an optional hint and error message.

Provide a visible label, the control (`cc-input` on an `input`, `textarea` or `select`), and an `id` that the label's `for` points to. Add a hint for format rules and an error for what went wrong.

- Keep the label above the control, in `cc-field__label`. Placeholders show an example only; never use one instead of a label.
- Set controls at 16px so iPhones do not zoom on focus, and keep them at least `control-height` tall.
- On error, add `is-error` to the field, set `aria-invalid="true"` on the control, and write what to do: "No class with that code." or "Add more text (80+ chars)."
- Focus shows the 2px `accent` ring. The border is `line-strong` so the control is findable without color.
- Uppercase and widen the join-code input with `text-transform:uppercase` and `letter-spacing:.1em`, but keep the placeholder readable.
