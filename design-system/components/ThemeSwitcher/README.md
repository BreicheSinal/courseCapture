ThemeSwitcher lets a person pick Light, System or Dark for the whole app.

It follows the structure of Vercel's Geist theme switcher (three options, default and small sizes, disabled when a theme is forced), restyled with CourseCapture tokens and written in sentence case.

Render a `cc-theme` radio group with three `cc-theme__opt` buttons, each `role="radio"` with `aria-checked` and an `aria-label` ("Light", "System", "Dark") because the buttons show icons only.

- **Default.** System, which follows the device. Save the choice per person.
- **Placement.** One switcher per app, in the account menu, the settings page or the footer. Do not repeat it on every screen.
- **Keyboard.** Arrow keys move the selection and select it; Tab leaves the group.
- **Small.** Use `cc-theme--sm` in a footer or a compact toolbar.
- **Forced theme.** When a page fixes its theme, such as an exported course, set `aria-disabled="true"` on the group and `disabled` on the buttons, and say why nearby.
- **Not a switch.** Three choices are not an on and off, so do not rebuild this from a Switch.
