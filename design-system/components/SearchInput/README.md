SearchInput filters a list as the person types, such as the roster or a course library.

It follows the structure of Vercel's Geist search input (search icon, clear button, keyboard shortcut hint, loading and disabled states), restyled with CourseCapture tokens and written in sentence case.

Build it from an `cc-inputbox` inside a `cc-search` wrapper with `role="search"`: a search icon affix, an `input type="search"`, then optional trailing parts.

- **Placeholder.** Name what is searched: "Search students", "Search courses". Add an `aria-label` with the same words.
- **Clear.** Show a `cc-search__btn` with an X once there is a value, with `aria-label="Clear search"`. Clearing returns focus to the input.
- **Shortcut.** Show a `cc-search__kbd` hint such as "⌘K" when empty. Once there is a value it changes to "Esc", and Escape clears the field.
- **Loading.** Replace the clear button with `cc-search__spin` while results load. Keep typing enabled.
- **Disabled.** Use the `disabled` attribute on the input and `is-disabled` on the box.
- **Results.** Announce the count in an `aria-live="polite"` line ("4 students"). When nothing matches, show an EmptyState: "No students match 'omar'".
