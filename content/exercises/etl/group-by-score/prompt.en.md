You are turning a new-format tile score table, `Dict(String, Int)` (lowercase tile -> score), back into the format the old system reads. Most tiles are a single letter, but some, like `"ch"`, are two letters. Write `to_legacy(scores)`.

- The result is a `Dict(Int, List(String))`: for each score, the list of tiles worth that score.
- Convert tiles to **uppercase**.
- Sort each list in ascending (alphabetical) order by `string.compare`. Example: `"C"`, `"CH"`, `"D"`
- Do not add a key for a score that does not appear in the input.

```gleam
to_legacy(dict.from_list([#("g", 2), #("a", 1), #("d", 2)]))
// -> dict.from_list([#(1, ["A"]), #(2, ["D", "G"])])
```
