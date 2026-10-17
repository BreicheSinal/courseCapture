JoinCode shows a class's five-character join code in a tinted bar with Copy code and New code icon buttons.

Provide the code string, a Copy handler and a New code handler. The label reads "Class join code — share it with students".

- Set the code in `join-code` on `accent-soft` with `accent-text`. Selecting the code selects all of it.
- Use two IconButtons at the right: copy (`aria-label="Copy code"`) and refresh (`aria-label="Generate new code"`).
- Make New code a two-step action: the first press swaps the refresh icon for the text "Sure?", the second press issues a new code and invalidates the old one.
- Show a short Toast ("Code copied") after Copy. Do not use the code as a secret; anyone with it can join the class.
