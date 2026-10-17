Toggle turns one setting on or off, and the change takes effect right away.

It follows the structure of Vercel's Geist toggle (an on and off control with a label, default and small sizes, disabled), restyled with CourseCapture tokens and written in sentence case. Geist calls the segmented choice "Switch"; that one is the Switch component here.

Render a `label.cc-toggle` with a visually hidden `input type="checkbox" role="switch"` and a `cc-toggle__track`. The label is part of the control.

- **When.** A single setting that applies immediately, such as "Show answers after the quiz". If the change needs a Save button, use a Checkbox instead.
- **Label.** Name the setting, not the action: "Email me about due dates", never "Turn on emails". The state is shown by the control, so do not put "on" or "off" in the label.
- **Sizes.** Default, and `cc-toggle--sm` in dense lists.
- **Disabled.** Keep it visible and explain why next to it.
- **Not for.** Choosing between named options: use Radio or Switch.
