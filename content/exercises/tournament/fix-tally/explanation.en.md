The program is split into `parse_line → record → points/compare_rows → format_row`, so if you start by suspecting the functions that the failing tests call, you can narrow down where the bugs are quickly. A pure function gives the same value wherever it is called, as long as the input is the same, so you can trust the result of calling one step on its own and move on to the next step (theory note "Referential transparency").

**Bug 1: draws in `record`.** The `Draw` branch updated only the home team. A match always changes the records of both teams, so update the away team with `Draw` too. If you restructure it like the base exercise's solution, first turning the result into a `#(home's view, away's view)` pair and then updating each team once, you rule out the very mistake of repeating update code in every branch and forgetting one side.

**Bug 2: the formula in `points`.** `stats.won * 3 + stats.lost` gives points for losses. `stats.won * 3 + stats.drawn` is correct. Places that use fields with similar names only show their bugs when tested with inputs whose values all differ (for example `Stats(2, 1, 3)`).

**Bug 3: the sort direction.** `int.compare(points(a.1), points(b.1))` is ascending. Swap the arguments to `int.compare(points(b.1), points(a.1))`, and leave the name comparison (`string.compare(a.0, b.0)`) as it is.

A common wrong fix is `list.sort(order.reverse(compare_rows))`. Points become descending, but the name order on ties is reversed too, so `Courageous` comes before `Allegoric`. When there are several sort keys, pick out only the key that should be reversed and reverse just that one.

*Original: the `tournament` exercise from Exercism's Gleam track (MIT, Copyright (c) 2021 Exercism). Restructured as a bug-fixing exercise.*
