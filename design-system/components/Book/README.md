Book is a cover tile with a title, for landing pages, a course library hero or an export's front page.

It follows the structure of Vercel's Geist book (a title on a book-like cover, simple and stripe variants, texture, an optional icon), restyled with CourseCapture tokens and written in sentence case.

Render a `cc-book` with a `cc-book__title` heading. Set its width with the `--book-w` custom property; the 3:4 proportion is fixed, so the book scales cleanly.

- **Variants.** Simple has just the title. Add `cc-book--stripe` for a band across the top that signals a series or category. Add `cc-book--textured` for a single hero cover, never for a row of books.
- **Color.** The default is `accent` with `on-accent` text. Other covers are `cc-book--soft` (accent-soft), `--ink` and `--neutral`. All pair text and cover from tokens, so they hold in Light and Dark. Do not set literal colors.
- **Icon and meta.** An optional `cc-book__icon` (a 24px stroke icon) sits above the title, and a `cc-book__meta` line such as "9 modules" sits at the bottom. Keep titles to two or three short lines.
- **Accessibility.** The title is the heading; mark the icon `aria-hidden="true"`. If the cover is a link, make the `a` the `cc-book` itself so the focus ring surrounds the whole cover.
- **Use for** marketing and library covers. In dashboards and lists, use CourseCard or Entity instead.
