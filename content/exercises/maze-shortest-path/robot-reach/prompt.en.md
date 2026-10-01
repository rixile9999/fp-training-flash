On a warehouse floor grid, count how many cells a robot can reach from its start cell `S` in at most `max_steps` moves.

```gleam
pub fn reachable_count(floor: List(String), max_steps: Int) -> Int
```

- Each string is one row. `S` is the robot's position, `#` is a shelf (cannot be passed) and `.` is an aisle.
- The robot moves one cell up, down, left or right at a time, and cannot move into shelves or outside the grid.
- The start cell counts too (0 moves). Each cell is counted only once. `max_steps` is 0 or more.
- If there is no `S`, return 0.

Tools are provided at the bottom of the module: an immutable queue built from two lists (`new_queue`, `push`, `pop`), `parse_grid`, which turns the grid into a `Dict(Pos, String)`, `find_cell`, which finds the position of a character, and `open_neighbors`, which returns the neighbors you can move to. `Pos` is `#(row, column)`.

```gleam
reachable_count([
  ".#..",
  "S#..",
  "....",
], 3)
// -> 5   S (0 moves), the cells above and below S (1 move), the second cell of the bottom row (2 moves), the third cell (3 moves)
```
