StatTile is a small number-over-label tile; three of them sum up a class at the top of the teacher's view.

Provide a number (with its unit, such as "72%") and a short label. Use exactly the three the teacher scans: Students, Courses and Avg. completion.

- Set the number in bold tabular numerals and the label in `ink-muted` on `surface`. Do not move a tile onto `surface-sunken`, where `ink-muted` is too faint.
- Use `cc-stats` to lay out the row; it keeps three equal columns down to phone width.
- Do not add a trend arrow, color or icon. If a figure needs a caption, put it in the label.
