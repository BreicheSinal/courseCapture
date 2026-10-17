Announcement is a short teacher post shown to every student in a class, newest first.

Provide the date, the text and, for the teacher's view only, a Delete handler.

- Show the date in `caption` on the left; show the class name beside it in the student view, where announcements from several classes are mixed.
- Set the text in `callout` and keep line breaks.
- Teachers get a trash IconButton (`cc-iconbtn--xs`, `aria-label="Delete announcement"`) at the right of the date. It confirms in place: the first press swaps the icon for "Sure?", the second deletes. Students never see it.
- Do not add a colored left border or an emoji marker. The card border and the date are enough.
