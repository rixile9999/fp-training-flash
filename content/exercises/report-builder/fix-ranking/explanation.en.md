When the functions are split into steps, finding a bug becomes a matter of asking "which step's output is wrong?". If you call `parse_line`, `total_by_product` and `format_row` separately, they all behave as expected; only `rank` and the last step of `build_ranking` are wrong. Each function is a pure function, so what you confirm by checking one step on its own holds just the same inside the whole pipeline (theory note "Referential transparency").

**Bug 1: the comparison direction and tie handling in `rank`.** `list.sort` puts the first argument first when the comparison function returns `Lt`. `int.compare(a.1, b.1)` is ascending, so swap the arguments to `int.compare(b.1, a.1)` to get descending order. The order when quantities are equal is also a requirement, so add ascending name order with `order.break_tie(string.compare(a.0, b.0))`. If you fix only the descending order, tied products stay in input order and the result varies from test to test.

**Bug 2: the rank numbers.** The index from `list.index_map` starts at 0. Ranks shown to people start at 1, so pass `format_row(index + 1, row)`. This conversion is the responsibility of the step just before output; `format_row` itself is right to use the number it receives as is.

Sorting in ascending order and then flipping with `list.reverse` is also a common approach, but it flips the order of tied products too. Only the key that should be reversed (the quantity) should be reversed, inside the comparison function.

A common mistake is fixing just one bug and stopping. Don't stop just because one example input came out right; check separately the cases that need more than one key, such as ties.
