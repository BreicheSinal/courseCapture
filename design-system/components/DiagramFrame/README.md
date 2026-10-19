DiagramFrame holds an AI-drawn diagram in a module, with its caption and a line saying who drew and checked it.

Render a `figure.cc-diagram-frame`: a `div.cc-diagram` with `role="img"` and an `aria-label` (the diagram's alt text) around the sanitised SVG, then a `figcaption` with `cc-diagram-frame__caption` and `cc-diagram-frame__ai`. Put it inside a Card in the module reader.

- **Alt text.** Required. Describe what the diagram shows, in the course's language; when there is no alt, use the caption. Set `lang` on the frame to the course's language.
- **AI label.** Always show it: "Diagram drawn by Claude, checked by your teacher".
- **Both themes.** The drawing uses `currentColor` and the accent; fixed white and black are removed when it is sanitised, so one drawing works in Light and Dark.
- **Size.** The SVG scales to the well and is centred; a wide drawing scrolls sideways inside the well, never the page.
- **Edit variant.** `cc-diagram--edit` gives the well a `surface` fill for the teacher's module editor.
