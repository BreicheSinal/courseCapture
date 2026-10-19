Button is the single control for every action, with five styles, four sizes, icon and icon-only shapes, a busy state and a full-width option.

It follows the structure of Vercel's Geist button (default, secondary, tertiary, error and warning styles; tiny to large sizes; square and circle icon shapes; prefix and suffix icons; loading; a link form), restyled with CourseCapture tokens and written in sentence case.

Provide a short label that names the outcome, in sentence case: "Assign to Biology", "Post announcement". Never a bare "OK".

- **Styles.** `cc-btn--primary` once per view for the main action. `cc-btn--secondary` for equal-weight alternatives such as "Preview". `cc-btn--tertiary` (quiet gray fill) for supporting actions in a toolbar. `cc-btn--ghost` for low emphasis such as "Cancel". `cc-btn--warning` for actions that need care. `cc-btn--danger` only for destructive steps.
- **Sizes.** Default is `control-height` (44px), the touch target. `cc-btn--lg` for a hero action, `cc-btn--sm` for dense lists, `cc-btn--tiny` for inline tools. Keep the default everywhere on touch screens.
- **Icons.** Put a 16px stroke icon before or after the label for a prefix or suffix. The label stays; the icon never replaces it.
- **Icon only.** `cc-btn--square` or `cc-btn--circle` with a single icon and an `aria-label` that names the action and its target ("Copy join code"), never the icon. For a bordered tool in a dense row, IconButton is the lighter choice.
- **Shape.** Add `cc-btn--pill` for a rounded marketing button.
- **Destructive.** Confirm in place: the first click changes the label to "Sure?" and sets `data-confirm="true"`; the second acts. For irreversible or large deletes, use DestructiveActionModal.
- **Loading.** Set `aria-busy="true"`, add a `cc-btn__spin` before the label and change the label to what is happening ("Generating part 2/4…"). The button stays focusable; do not add a separate spinner.
- **Disabled.** Use `disabled` only when the action is not possible right now, and say why in a `title` or the hint beside it. A link button uses `aria-disabled="true"`.
- **Links.** An `a` with `cc-btn` looks like a button but navigates. Use a button for an action that changes state, a link for going to another page.
- **Full width.** `cc-btn--block` in a narrow card, such as "Join" under the code field.
- **Do not** put two primary buttons side by side, put an `aria-label` on a button that already has visible text, or rely on color alone to mark a destructive action.

- **Off but focusable.** While saving, or until a choice is made ("Pick an answer first"), set `aria-disabled="true"` instead of `disabled` so focus stays on the button, and point `aria-describedby` at the hint. It dims to 45%; with `aria-busy` too it stays at full strength.
