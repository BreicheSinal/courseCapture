Skeleton is a placeholder shaped like content that is still loading, so the page does not jump when it arrives.

It follows the structure of Vercel's Geist skeleton (default, pill, rounded and squared shapes, a shimmer that can be switched off), restyled with CourseCapture tokens and written in sentence case.

Compose `cc-skel` blocks to match the final layout. Set the width and height inline to match the real content.

- **Shapes.** Default has `radius-sm`. Add `cc-skel--pill` for badges and buttons, `cc-skel--round` for avatars, and `cc-skel--square` for images with square corners. `cc-skel--title` and `cc-skel--block` are ready-made sizes for a heading line and a card image.
- **Size.** Match the final size so nothing shifts when the data lands. Use skeletons only where the layout is known; otherwise use a spinner or an EmptyState.
- **Motion.** The shimmer runs 1.4s and stops under reduced motion. Add `cc-skel--still` to turn it off for a long list.
- **Accessibility.** Set `aria-busy="true"` on the region being loaded and `aria-live="polite"` on the container the content arrives in. Do not put focusable controls inside a skeleton.
- **Not for** empty results or errors; those get an EmptyState.
