JobList shows the steps of a background job, such as generating a course, with a word and a mark for each step's state.

Render a `ul.cc-joblist`. Each `li` holds the step's name and a `cc-joblist__state` at the end; add `is-done`, `is-current` or `is-failed`. Announce changes with a polite live region around the list.

- **States.** Waiting (no class): "Waiting". Current: bold name, "In progress" in `accent-text`. Done: "Done" in `success` with a check. Failed: "Failed" in `danger`, with a Try again button below the list.
- **Words always.** Every state has its word, so color is never the only cue.
- **Steps.** Name them the way the teacher would: "Reading the file", "Writing modules", "Drawing diagrams".
