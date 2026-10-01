In a maze given as a list of strings, find the minimum number of moves from the start `S` to the goal `G`.

```gleam
pub fn shortest_path(grid: List(String)) -> Result(Int, Nil)
```

- Each string is one row, and all rows have the same length. `S` is the start, `G` is the goal, `#` is a wall and `.` is an empty cell.
- Each move goes one cell to the neighbor above, below, to the left or to the right. There are no diagonal moves, and you cannot move into walls or outside the grid.
- `S` and `G` each appear at most once. If either is missing or `G` cannot be reached, return `Error(Nil)`.
- It must finish quickly even on a grid with 6,400 cells (80x80).

`parse_grid`, which turns the grid into a `Dict(Pos, String)`, and `find_cell`, which finds the position of a character, are already provided. `Pos` is `#(row, column)`.

```gleam
shortest_path([
  "S#..",
  ".#.#",
  "...G",
])
// -> Ok(5)   down, down, right, right, right
```
