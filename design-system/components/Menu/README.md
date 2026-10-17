Menu is a list of actions that opens from a trigger button, for secondary actions that do not need their own button on screen.

It follows the structure of Vercel's Geist menu (trigger, panel, items, sections, dividers, destructive and locked items, typeahead and keyboard navigation), restyled with CourseCapture tokens and written in sentence case.

Provide a trigger and the items. The trigger is a secondary Button with a chevron, an IconButton with the "more" icon and an `aria-label`, or an Avatar button. Items are `cc-menu__item` buttons with `role="menuitem"` inside a `cc-menu__panel` with `role="menu"`.

- **Opening.** Open on click or Enter, never on hover. Set `aria-haspopup="menu"` and `aria-expanded` on the trigger. Use `cc-menu__panel--floating` to place the panel under the trigger, and `--end` to align it to the trigger's right edge. Keep it inside the screen; flip it above the trigger near the bottom edge.
- **Keyboard.** Up and Down move between items, Home and End jump to the first and last, Enter or Space activates, and typing a letter moves to the next item that starts with it. Escape, activating an item or clicking outside closes the menu and returns focus to the trigger. Put the visible label first in each item so typeahead matches what people read.
- **Items.** Write each as a verb and a noun in sentence case: "Preview course", "Export HTML". Add an ellipsis only when the item opens a follow-up dialog. A 16px stroke icon may sit before the label. Keep a menu to about ten items; use sections or move the rest elsewhere beyond that.
- **Sections and dividers.** Group with a one- or two-word `cc-menu__section` title or a `cc-menu__divider`.
- **Destructive item.** Put it last, after a divider, in `cc-menu__item--danger`, named with a verb and a noun: "Delete course". It confirms in place: the first activation keeps the menu open and changes the label to "Sure?", the second acts and closes.
- **Choice items.** For a single choice such as language, use `role="menuitemradio"` with `aria-checked`; the selected item is bold and shows a check at the right.
- **Locked item.** For an action the person is not allowed to take, keep the item visible with `aria-disabled="true"` and a lock icon, and explain why in its `title`: "Only the page owner can switch roles".
- **Not a menu.** For actions that must stay visible, use Buttons. For navigation between pages, use links. Do not put a menu on hover.
