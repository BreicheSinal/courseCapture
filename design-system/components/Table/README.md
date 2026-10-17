Table shows rows of records that share the same columns, such as a class roster with progress and quiz scores, or a quiz-results export. It replaces the old StudentRow: a roster is a Table.

It follows the structure of Vercel's Geist table (root, header, body, footer, striped, bordered and interactive rows, a virtualized body for large sets), restyled with CourseCapture tokens and written in sentence case.

Wrap a real `table.cc-table` in a `cc-tablewrap`, which scrolls sideways on narrow screens. Use `thead`, `tbody` and optional `tfoot`, with `th scope="col"` for headers and `th scope="row"` for the row's name cell. Add `caption` for an accessible name.

- **Variants.** `cc-table--bordered` draws row dividers, `cc-table--striped` alternates row tint, and `cc-table--interactive` adds a hover and focus tint on rows that open something. Combine them. Keep ink text on striped rows; muted text is not allowed on the sunken tint.
- **Headers.** Short sentence-case noun phrases ("Quiz score", not "Quiz score by student"). The header row stays pinned while the body scrolls.
- **Sorting.** A sortable header holds a `cc-table__sort` button with a decorative arrow and `aria-sort` on the `th`. The button's accessible name says the next state: "Sort by quiz score, descending".
- **Roster.** Put the student in the row header cell as `cc-table__person`: a `cc-avatar` with the first initial, then the name as a link. Show progress in a `cc-table__progress` cell: a `cc-progress` bar with `role="progressbar"`, `aria-label` naming the student, and `aria-valuenow` and `aria-valuemax`, plus the count as "5/9". Never color a row by score; use the number. On a phone the table scrolls sideways inside its wrapper.
- **Numbers.** Right-align numeric columns with `cc-table__num`; digits use tabular numerals so they line up. Show unknown or inapplicable values as an em dash (—), never "N/A" or a blank cell.
- **Footer.** Use `tfoot` for a summary such as the class average. Cells may span columns.
- **Interactive rows.** Put a real link or button in the first cell (`cc-table__link`) so the row is reachable by keyboard; the row hover is a convenience, not the only way in.
- **Virtualized.** For hundreds or thousands of rows, add `cc-tablewrap--virtual` and set its height with `--table-h`. Render only the rows in view plus a small buffer, keep every row the same height, give rows stable keys, and keep the header sticky. Set `aria-rowcount` on the table and `aria-rowindex` on rows so assistive technology knows the full size. Show the first screenful with a `cc-table__more` fade and a "Show all rows" button where the full list is optional.
- **Empty and loading.** When nothing matches, replace the table with an EmptyState; do not draw an empty body. While loading, show Skeleton rows in the same columns.
- **Paging.** Use Pagination under the table, and say where the person is: "Page 2 of 7".
- **Not a table.** For a descriptive list with one action per row, use Entity.
