A Gleam list is a linked list built from the front, so prepending with `[language, ..languages]` is the most natural choice, and its cost is constant. `list.append(languages, [language])` adds to the end, so the order differs from what is asked, and it copies the whole list.

`list.length` and `list.reverse` are enough for counting and reversing. You could write them yourself with recursion, but using standard functions that are already tested makes the intent clearer.

`exciting_list` translates "the shapes that are true" directly into list patterns.

```gleam
case languages {
  ["Gleam", ..] -> True
  [_, "Gleam"] | [_, "Gleam", _] -> True
  _ -> False
}
```

`[_, "Gleam"]` matches only lists of length exactly 2, and `[_, "Gleam", _]` only lists of length exactly 3, so the length condition lives inside the patterns. There are two common mistakes.

- `list.contains(languages, "Gleam")`: it ignores the position, so a Gleam in third place also counts as true.
- `[_, "Gleam", ..]`: because of the rest pattern `..`, it also matches lists of length 4 or more.

The view of a list as "either an empty list, or one element followed by the rest of the list" is covered further in the theory note structural-recursion-induction (structural recursion and induction), and splitting cases exhaustively with `case` in "Sum types and exhaustive matching".
