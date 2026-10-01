Solved in one go, this exercise easily turns into one long function, but if you cut it at each point where the shape of the data changes, each piece is short.

```text
String ─split→ List(String) ─filter_map(parse_line)→ List(Match)
       ─fold(record)→ Dict(String, Stats) ─to_list→ List(#(String, Stats))
       ─sort(compare_rows)→ ─map(format_row)→ List(String) ─join→ String
```

`tally` is this flow written down directly with pipes (theory note "Function composition and pipelines"). Each step is a pure function, so you can test it step by step too.

**Parsing.** If you match a list pattern together with string literals, as in `[home, away, "win"]` in `case string.split(line, ";")`, the field-count check and the result-string check are done in one go. Once the result is turned into the `Outcome` type, later steps don't have to worry about typos in strings (theory note "Sum types and exhaustive matching"). If you treat everything else as `Draw`, as the original Exercism solution does, an invalid line such as `tie` gets recorded as a draw.

**Updating records.** The match result is from the home team's point of view, so first turn it into a `#(home's result, away's result)` pair (`Loss -> #(Loss, Win)`). Then applying the same `add_result` function to both teams makes it less likely that you forget to "update the away team too" or mix up the points of view. The whole list of matches is folded with `list.fold(dict.new(), record)` (theory note "The universality of fold").

**Sorting.** `int.compare(points(b.1), points(a.1))` swaps the arguments to get descending order, and `order.break_tie` uses the name comparison only when the points are equal. The order of `dict.to_list` is not guaranteed, so the name order must be sorted explicitly too.

**Output.** Team names use `string.pad_end` (left-aligned) and numbers use `string.pad_start` (right-aligned). Swap the two and every row is misaligned.

Common mistakes: a copy-paste mistake where `loss` is recorded as the home team's loss and the away team also gets a loss, treating unknown results as draws, and right-aligning team names.

*Original: the `tournament` exercise from Exercism's Gleam track (MIT, Copyright (c) 2021 Exercism). Restructured with separate helper functions and rules for handling invalid lines.*
