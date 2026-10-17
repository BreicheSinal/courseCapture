Breadcrumbs show where the person is in the app and let them go back up, such as Classes, Biology 101, Photosynthesis, Module 3.

It follows the structure of Vercel's Geist breadcrumbs (a trail of items from the top down, an active current item, a disabled item, a text and a menu variant), restyled with CourseCapture tokens and written in sentence case.

Render a `nav` with `aria-label="Breadcrumb"` and an ordered list. Each ancestor is a `cc-crumbs__link`; the last item is the current page, marked `aria-current="page"`, not a link.

- **Order.** Top of the hierarchy first, current page last. The "/" separators are drawn by CSS and are not read aloud.
- **Current page.** Bold and `ink`. Ancestors are `ink-muted` links that darken and underline on hover.
- **Disabled.** An item the person cannot open, such as a class they were removed from, stays visible with `aria-disabled="true"` and no `href`.
- **Long trails.** Keep the first item and the last two, and collapse the middle into a "…" button (`cc-crumbs__more`, `aria-label="Show more levels"`) that opens a Menu of the hidden items. The menu variant is also right when the trail would wrap on a phone.
- **Labels.** Use the item's own name ("Biology 101", "Module 3") and keep each short; long names truncate.
- **Keyboard.** Every ancestor is a real link in the tab order. The "…" button opens its menu with Enter or Space and follows Menu behavior.
- **Not for.** Moving between sibling pages: use Pagination. The steps of a course: use ModuleNav.
