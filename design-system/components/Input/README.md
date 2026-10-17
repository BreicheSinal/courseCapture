Input is the single-line text control, now with sizes, a prefix or suffix, a helper line and an error line. It extends Field; use Field for the label and message wrapper.

It follows the structure of Vercel's Geist input (small, medium and large sizes, prefix and suffix slots, label, error message, disabled), restyled with CourseCapture tokens and written in sentence case.

Wrap a `cc-input` in a `cc-field` with a `cc-field__label`. For a prefix or suffix, put the input inside a `cc-inputbox` with `cc-inputbox__affix` spans (an icon or short text such as "https://" or "min").

- **Sizes.** Medium is the default at `control-height` (44px). Use `cc-input--sm` (or `cc-inputbox--sm`) at `control-height-sm` in dense toolbars, and `--lg` for a hero field such as the join code.
- **Name.** Every input has a visible label tied with `for` and `id`. If a label is truly hidden, add `aria-label`. A placeholder shows an example ("Biology 101"), never the label.
- **Helper text.** One sentence in `cc-field__hint`, linked with `aria-describedby`.
- **Errors.** Add `is-error` to the field, set `aria-invalid="true"`, and show the message in `cc-field__error`, linked with `aria-describedby`. Say what to do: "Enter a five-character code." Validate when the person leaves the field, not on every key.
- **Disabled.** Use the `disabled` attribute; the field turns to the sunken surface. Say why in the hint when it is not obvious.
- **Prefix and suffix.** Affixes are decoration or units, not the label. Keep them muted, and keep the input itself focusable and the whole box ringed on focus.
- **Behavior.** Trim leading and trailing whitespace on save. Keep the field focusable while saving so a slow request does not trap typing.
