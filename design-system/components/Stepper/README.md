Stepper shows where a teacher is in a short flow of three to five steps, such as building a course: Source, Generate, Review & assign.

Render an `ol.cc-steps` with an `aria-label` naming the flow ("Course steps"). Each `li.cc-steps__item` holds a `cc-steps__bar` (`aria-hidden`) and a `cc-steps__label` reading "n · Name". Add `is-done` to finished steps and `is-current` with `aria-current="step"` to the one in progress.

- **States.** Upcoming: `line` bar, `ink-muted` label. Done: `accent` bar, `ink` label. Current: `accent` bar, `accent-text` label in bold. The number and the weight carry the state, so it never depends on color alone.
- **Labels.** One or two words, a noun: "Source", "Review & assign". Format the number with `Intl` so Arabic shows Arabic digits.
- **How many.** Three to five. More steps belong in a checklist or a JobList.
- **Not clickable.** The Stepper reports progress; moving between steps is the screen's own Back and Continue buttons.
- **Right to left.** The grid flows from the start edge; nothing mirrors.
