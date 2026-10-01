There are only three ways to make the last character of `from` match the last character of `to`: delete the last character (deletion), add the last character of `to` (insertion), or replace it (substitution, which costs 0 if they are equal). Whichever you pick, what remains is "the distance between shorter prefixes". So if you let d(i, j) = "the minimum number of edits to turn the first i characters into the first j characters", then

d(i, j) = min(d(i-1, j) + 1, d(i, j-1) + 1, d(i-1, j-1) + (0 if equal, otherwise 1))

and when an empty string is involved, d(0, j) = j and d(i, 0) = i (`dynamic-programming-subproblems`).

If you write this formula directly as recursion, the answer is correct, but the same (i, j) gets recomputed along many paths. Each extra character multiplies the number of calls, so 300 characters never finishes. There are only (n+1) x (m+1) distinct (i, j) pairs, so computing each one once with a table gives O(n x m).

Instead of the whole table, the solution builds **one row at a time**. Row i can be computed from row (i-1) alone, so it becomes a `fold` that starts from the first row `[0, 1, ..., m]` and builds the next row for each character of `from`. `fill` walks the row above from the front, looking at two cells at a time (diagonal and above), computes the new cell together with the value to its left, stacks the result in front of the accumulator, and reverses once at the end. It only reads from and prepends to the front of immutable lists, so each cell costs O(1) (`cost-model-immutable-structures`).

There are three common mistakes. If you fill the first row with zeros, the cost of "building from an empty string" disappears. If you leave out substitution and use only deletion + insertion, a single differing character counts as 2. And if you count bytes, as with `string.byte_size`, one Hangul character becomes 3. Splitting with `string.to_graphemes` gives you character units.
