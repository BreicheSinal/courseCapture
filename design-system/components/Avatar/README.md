Avatar is a circle that identifies a person by their first initial or photo, in three sizes and three tones, with an overlapping group for rosters.

Provide the person's name for the `aria-label` (or `alt` on a photo) and render the first letter, uppercased. With a photo, put an `img` inside the avatar; it fills the circle.

- **Sizes.** Default is `avatar` (28px) beside names in rows. Use `cc-avatar--sm` (24px) in dense chips and `cc-avatar--lg` (40px) next to a title or in a profile.
- **Tones.** Use the solid accent tone for the signed-in person, `cc-avatar--soft` for other people, and `cc-avatar--neutral` for unknown people or counts. Do not give each person a different color; the tone says who you are, not who they are.
- **Group.** Wrap avatars in `cc-avatars` to overlap them by `space-2` with a ring in the surface color. Show at most four, then a neutral avatar with the remaining count ("+3") and an `aria-label` such as "3 more students". Place groups on `surface`.
- **Photo or initial.** Never show both. If a photo fails to load, fall back to the initial.
- **Do not** put an avatar on its own as a button without an accessible name, and do not use an emoji or a drawn face.
