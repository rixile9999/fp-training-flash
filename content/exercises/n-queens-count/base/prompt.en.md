Count the number of ways to place n queens on an n x n chessboard so that no two attack each other. A queen attacks any queen in the same row, the same column or the same diagonal.

Queens are placed one per row, starting from the top row. The queens placed so far are represented as a list of column numbers (from 0), with **the queen in the row just above at the front**. Implement the following two functions.

- `is_safe(placed: List(Int), col: Int) -> Bool`: `True` if a queen placed in column `col` of the next row shares no column or diagonal with any queen in `placed`.
- `count_solutions(n: Int) -> Int`: the number of placements on an n x n board. `n` is at least 1.

Check that each queen is safe as you place it, and do not go any deeper from an unsafe square. Grading measures the search cost up to n = 9.

```gleam
is_safe([1], 2)     // -> False  on a diagonal with the column-1 queen in the row just above
is_safe([3, 0], 1)  // -> True
count_solutions(4)  // -> 2      [1, 3, 0, 2] and [2, 0, 3, 1]
```
