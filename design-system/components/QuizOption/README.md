QuizOption is one answer choice in a module's quick check; it shows the result after the student answers.

Provide the option text and an `onClick`. After the first answer, add `is-correct` to the right option and `is-wrong` to the one the student picked, and fill the `cc-option__mark` with "Correct" or "Not quite".

- Always show the word in `cc-option__mark` next to the color change, so the result does not depend on hue.
- Stack options with `space-2` between them, full width, left aligned.
- Count only the first answer toward the quiz score; later taps still reveal the right answer.
- Do not use QuizOption for navigation or settings. Use Button.
