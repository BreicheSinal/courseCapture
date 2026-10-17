Badge is a small pill that labels a role, a class or a status, or groups similar items.

It follows the structure of Vercel's Geist badge (color variants, sizes, a low-contrast version, an icon slot, a link pill), restyled with CourseCapture tokens. Labels stay uppercase to match the rest of the system.

Provide a one- or two-word label. Pick the variant by meaning: `cc-badge--info` for roles and class names, `cc-badge--neutral` for plain states such as "Draft", `cc-badge--success` for finished work or a healthy state, `cc-badge--warning` for attention such as "Overdue", `cc-badge--danger` for errors such as "Failed".

- **Meaning, not decoration.** Green is healthy, amber is attention, red is an error, blue is informational, gray is neutral. Always keep the word; color only reinforces it.
- **Contrast.** The default is outlined. Add `cc-badge--tint` to `success`, `warning` or `danger` for the subtle filled version in dense lists. Use `cc-badge--solid` (accent fill) or `cc-badge--inverted` (ink fill) for the one badge per view that must stand out.
- **Sizes.** Default is medium. `cc-badge--sm` for tables and rows, `cc-badge--lg` for headers.
- **Icon.** An optional 12px stroke icon sits before the text; badges hold only text or an icon plus text, never another badge. Do not add a check or X to success and error badges. Give an icon-only badge a `title`.
- **Placement.** One badge per row. Place `success`, `warning` and `danger` on `bg` or `surface`; those colors do not reach 4.5:1 on `surface-sunken`. `info`, `neutral`, `solid` and `inverted` carry their own fill.
- **Link pill.** An `a` with the `cc-badge` class works as a quiet link, such as a filter. Do not put a click handler on a `span` badge; if it does something, use a Button or a link.
- **Writing.** Short, canonical terms that match the data: "Canceled", "Overdue". No sentences; let the surrounding text explain.
- **Not for.** A dot with no text: use StatusDot. Lifecycle of a course build: StatusDot.
