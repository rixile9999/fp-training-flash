The `count_solutions(n)` below uses backtracking to count the number of ways to place n queens on an n x n chessboard so that no two attack each other. It goes down from the top row, placing one queen per row, and only in safe columns. But for a 4x4 board it answers 0 instead of 2. Fix it.

- `is_safe(placed, col)` is correct. `placed` is the list of column numbers with the queen in the row just above at the front.
- Each placement that fills every row counts as 1. `n` is at least 1.
- The search must not go any deeper from an unsafe square. Grading measures the search cost up to n = 9.

```gleam
count_solutions(4)
// now:      0
// expected: 2
```
