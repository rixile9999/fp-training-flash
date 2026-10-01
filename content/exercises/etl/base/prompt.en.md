You are moving the letter score table of a word game into a new format.

- Old format: for each score, the list of uppercase letters worth that score, `Dict(Int, List(String))`
- New format: one score per letter, `Dict(String, Int)`, with letters in **lowercase**

Write `transform(legacy)`.

- Every letter in the old lists appears in the result exactly once.
- A score with no letters (an empty list) adds nothing to the result.
- You can assume no input has the same letter under more than one score.

```gleam
transform(dict.from_list([#(1, ["A", "E"]), #(2, ["D"])]))
// -> dict.from_list([#("a", 1), #("e", 1), #("d", 2)])
```
