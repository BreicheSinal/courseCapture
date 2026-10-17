ModuleNav lists a course's modules beside the player, marking the current one and the ones a student has finished.

Provide the module titles, the index of the current one and the set of finished ones. Each item is a button that jumps to its module.

- Prefix each title with its number, or with "✓" once finished. The mark is text, so completion never depends on color alone.
- Mark the current item with `is-current` (tinted, bold) and finished items with `is-done`. Truncate titles at about 26 characters.
- On screens narrower than 640px the list becomes a horizontal strip you can scroll.
- Place it in a card at the left of the player on wide screens, and above the module on phones.
