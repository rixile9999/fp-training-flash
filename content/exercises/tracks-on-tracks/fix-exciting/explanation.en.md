The original code has bugs in two places.

1. `[_] -> False`: it sent every single-element list straight to False. `["Gleam"]` has Gleam first, so it should be True.
2. `list.length(languages) >= 2`: a list that reaches the `[first, second, ..]` branch already has length 2 or more, so this condition is always true. The condition that was needed was "the length is 3 or less".

If you fix the length condition with a numeric comparison, it is easy to be off by one between `<= 3` and `< 3`. If you write the shapes that are true directly as patterns, this kind of boundary mistake cannot happen.

```gleam
case languages {
  ["Gleam", ..] -> True
  [_, "Gleam"] | [_, "Gleam", _] -> True
  _ -> False
}
```

`[_, "Gleam"]` matches only lists of length 2, and `[_, "Gleam", _]` only lists of length 3. The empty list and other single-element lists go to the final `_`. The idea of splitting a list exhaustively by its shape is covered in the theory note "Sum types and exhaustive matching".
