Select is a dropdown for choosing one value from a short, fixed list, such as a language or a class.

It follows the structure of Vercel's Geist select (small, default and large sizes, a label, an error message, disabled, option groups), restyled with CourseCapture tokens and written in sentence case. It wraps a native `select`, so lists, search-by-typing and the phone picker all work.

Wrap a native `select.cc-input` in `div.cc-select` and add the `cc-select__chev` icon. Use it inside a Field for the label, hint and error.

- **When.** Roughly three to ten fixed options. Up to six where seeing them all helps: use Radio. Filtering a long list or choosing many values needs a Combobox or MultiSelect, which this system does not have yet.
- **Sizes.** `cc-input--sm`, default, and `cc-input--lg` on the `select`.
- **Label.** A visible Field label, or an `aria-label` on the select. Do not wrap a labeled select in a Tooltip; put help on a separate icon button.
- **Placeholder.** An action prompt such as "Select a language", never "Choose one" or a repeat of the label. Mark the empty option `disabled hidden`.
- **Groups.** For longer lists, use native `optgroup`.
- **Errors.** `is-error` on the Field, `aria-invalid="true"`, and a message that names the field and ends with a period: "Select a language." Validate on blur.
- **Disabled.** Keep the current value visible and explain why in the hint.
