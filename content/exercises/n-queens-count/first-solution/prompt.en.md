Among the placements of n queens on an n x n chessboard where no two attack each other, find the one that comes **first in lexicographic order**.

```gleam
pub fn first_solution(n: Int) -> Result(List(Int), Nil)
```

- A placement is the list of the column numbers (from 0) where the queen of each row sits, in order from the top row.
- Two placements are compared by their first column number, and if those are equal, by the next column number. The smaller one comes first.
- If there is no placement at all, return `Error(Nil)`. `n` is at least 1.

`is_safe(placed, col)` already exists. `placed` holds the column numbers of the rows above, with **the row just above at the front**, and it returns `True` if column `col` of the next row is safe.

```gleam
first_solution(4)  // -> Ok([1, 3, 0, 2])
first_solution(3)  // -> Error(Nil)
```
