Pagination moves between the previous and next page of a long list, such as a roster or a course archive.

It follows the structure of Vercel's Geist pagination (a previous and a next link, each with a short direction label and the destination's title), restyled with CourseCapture tokens and written in sentence case.

Provide a previous link, a next link, or both. Each is a `cc-pager__link` with a small direction label (`cc-pager__dir`) and the title of the page it leads to (`cc-pager__title`).

- **Ends of the list.** Leave out the link that has nowhere to go. On the first page there is only Next, on the last only Previous. Do not show a disabled link.
- **Titles.** Name the destination: "Module 3: Light reactions". Do not put arrows or "Page 3 of 10" in the title; the direction label already says which way it goes.
- **Next link.** Add `cc-pager__link--next` so it sits on the right with right-aligned text.
- **Accessible name.** Give each link an `aria-label` such as "Go to previous page: Module 1" and wrap the pair in a `nav` with `aria-label="Pagination"`.
- **Long titles.** Titles truncate with an ellipsis; each link takes at most half the width.
- **Use for** ordered content where people mostly step one page at a time. For jumping to a numbered page in a long table, add a page-number control later; this component does not draw one.
