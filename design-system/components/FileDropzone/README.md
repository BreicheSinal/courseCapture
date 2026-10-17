FileDropzone is where a teacher drops a PDF, PPTX, TXT or MD file to start a course, or picks one from their device.

Vercel's Geist has no file upload component, so this one is built for CourseCapture from the Field, Button and Progress parts and the same tokens. It follows common upload patterns: a native file input, a visible drop area, clear states and errors.

Render a `label.cc-drop` that wraps a `cc-drop__input` (a native `input type="file"` stretched over the area, so it is reachable by keyboard and screen readers), an icon, a `cc-drop__title` and a `cc-drop__hint`. After a file is chosen, show a `cc-file` row.

- **Copy.** Title: "Drop a file here or browse". Hint: the accepted types and the size limit: "PDF, PPTX, TXT or MD, up to 20 MB. Scanned PDFs work too." Add a "paste text" option beside it as a plain link or Button, not inside the drop area.
- **States.** Rest, hover and drag over (`is-over`: accent border, tinted fill), error (`is-error`: danger border and a message), and disabled (`aria-disabled="true"`).
- **Errors.** Name the problem and the fix: "That file is 34 MB. Choose one under 20 MB." Show it in `cc-drop__error`, not a toast, and keep the drop area usable.
- **Selected file.** A `cc-file` row with the name (truncated), size, a `cc-progress` bar while it uploads and an IconButton with `aria-label="Remove report.pdf"`. Announce progress and completion in an `aria-live="polite"` region.
- **Keyboard.** The whole area is one focus stop; Enter or Space opens the file picker. The focus ring surrounds the area.
- **Compact.** `cc-drop--compact` is a one-line version for inside a form.
- **Not for.** Several files at once; the app takes one source per course.
