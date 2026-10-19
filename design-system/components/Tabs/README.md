Tabs switch between sibling views on one page, such as Modules, Roster and Announcements inside a class.

It follows the structure of Vercel's Geist tabs (a tab list with optional icons, counts and tooltips; selected, focused and disabled states; a secondary style), restyled with CourseCapture tokens and written in sentence case.

Render a `div.cc-tabs` with `role="tablist"` and an `aria-label`. Each `button.cc-tab` has `role="tab"`, `aria-selected`, and `aria-controls` pointing at a `div.cc-tabpanel` with `role="tabpanel"`.

- **Labels.** One or two words, a noun: "Roster", not "View roster". Verbs belong on buttons. Never put a count in the label; use a small neutral Badge, and hide it at zero.
- **How many.** Five to seven on desktop and three or four on a phone. Beyond that, move the rest into a Menu.
- **Switching.** Instant, with no confirmation or toast. Reflect the selected tab in the URL so links and refresh keep it.
- **Keyboard.** Left and Right arrows move focus, Home and End jump, Enter or Space selects. Only the selected tab is in the tab order; the panel itself can take focus.
- **Disabled.** Only for permission or empty reasons; explain why in a Tooltip.
- **Secondary.** `cc-tabs--secondary` is a boxed, pill style for a toolbar inside a card.
- **Not for.** Going between unrelated pages (use navigation links) or choosing a mode of the same content in a form (use Switch).

- **As links.** When each section has its own URL (a class's Courses, Roster and Announcements), render `a.cc-tab` links in a `nav` and mark the current one with `aria-current="page"`; it gets the same underline as a selected tab.
