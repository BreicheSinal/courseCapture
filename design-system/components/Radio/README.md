Radio lets a person pick one option from a small set, with every choice visible at once.

It follows the structure of Vercel's Geist radio (a labeled group, stacked options, a disabled state, arrow-key movement), restyled with CourseCapture tokens and written in sentence case.

Wrap each option in a `label.cc-check.cc-check--radio` with a native `input type="radio"` that shares a `name`, and put the set in a `fieldset.cc-group` with a `legend`.

- **When.** Two to six mutually exclusive options. For more, use Select. For a simple on and off, use Toggle. For two or three view-style choices, use Switch.
- **Group name.** The legend is a short noun: "Course level". Set `required` on the group, never on a single radio.
- **Options.** Parallel wording and length ("Beginner", "Intermediate", "Advanced"). Add a one-line hint under an option only when the difference is not clear.
- **Default.** Pre-select the safest choice unless the decision has real consequences and the person should choose on purpose.
- **Keyboard.** Arrow keys move the selection and skip disabled options; Tab leaves the group. Keep the visible focus ring.
- **Disabled.** Keep the option visible and say why next to it.
- **Standalone.** A radio without a visible label needs an `aria-label`.
