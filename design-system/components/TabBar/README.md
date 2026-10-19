TabBar is the phone's main navigation: two or three tabs fixed to the bottom of every signed-in screen.

Render a `nav.cc-tabbar` with `aria-label="Main"` holding a `ul.cc-tabbar__list` of links, each an `a.cc-tabbar__tab` with a 22px stroke icon and a label. The current tab gets `aria-current="page"`. It hides at 1024px and wider, where a sidebar shows the same items.

- **Items.** Teacher: Classes · Courses · Settings. Student: Home · Classes · Account. Admin: Teachers · Invites. One-word nouns; the label is always shown, so the icon never stands alone.
- **Size.** Each tab is at least 52px tall. The bar pads itself by the home-indicator inset.
- **Current.** `accent-text` and bold; the others `ink-muted`.
- **Space below content.** `--tabbar-h` is the bar's height. Pad the page by it, and sticky action bars (`cc-actionbar`) sit at `bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom))` so they stay above the bar.
- **Not for.** Actions, or more than three destinations; put the rest in the account Menu.
- **Right to left.** The order follows the reading direction; icons don't mirror.
