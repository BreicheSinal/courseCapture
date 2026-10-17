Checkbox lets a person turn on any number of options from a list, or agree to something.

It follows the structure of Vercel's Geist checkbox (checked, unchecked, indeterminate and disabled states; a label that toggles it; grouped in a fieldset), restyled with CourseCapture tokens and written in sentence case.

Wrap a visually hidden native `input type="checkbox"` and a `cc-check__box` in a `label.cc-check`. The label text is the click target.

- **States.** Unchecked, checked, disabled, and indeterminate (`aria-checked="mixed"`) for a parent whose children are only partly selected. Indeterminate is a display state, not a third value; clear it once all children are on or off, and show the count: "3 of 5 selected".
- **Groups.** Put related checkboxes in a `fieldset.cc-group` with a short `legend` ("Quiz options"), without a trailing colon.
- **Labels.** Name what turns on. An acknowledgment is a full sentence: "I have read the course before assigning it." Add a one-line `cc-check__hint` under the label when the effect is not obvious.
- **Table rows.** A row-select checkbox has no visible label, so give it an `aria-label` that names the row: "Select Omar Khalil".
- **Disabled.** Say why next to it, or in a Tooltip on a wrapper, not on the label itself.
- **Validation.** Validate a required acknowledgment on submit, not on every change.
- **Not for.** A single on and off setting: use Toggle. One choice from a few: use Radio.
