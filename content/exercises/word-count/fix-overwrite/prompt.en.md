`tally` is a function that counts how many times each space-separated word appears. But whatever sentence you give it, every word's count comes out as 1. Fix the bug.

- `tally(input)`: lowercases the input, splits it on spaces, and applies `increment` to each word to build a `Dict(String, Int)`. (You don't need to change this function.)
- `increment(counts, word)`: if `word` is already there, adds 1 to its count; otherwise, adds it with 1. The counts of other words stay as they are.

```gleam
tally("fish one fish two fish")
// Expected: dict.from_list([#("fish", 3), #("one", 1), #("two", 1)])
// Actual:   dict.from_list([#("fish", 1), #("one", 1), #("two", 1)])
```
