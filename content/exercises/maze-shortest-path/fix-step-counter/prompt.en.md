The `shortest_path` below uses breadth-first search to find the minimum number of moves from the start `S` to the goal `G` in a maze. It gives the right answer in a straight corridor, but in a maze with branches the answer comes out too large. Fix it.

- Each string is one row. `S` is the start, `G` the goal, `#` a wall and `.` an empty cell.
- Each move goes one cell up, down, left or right, and you cannot move into walls or outside the grid.
- Return the minimum number of moves in `Ok`; if `S` or `G` is missing or G cannot be reached, return `Error(Nil)`.
- It must finish quickly even on an 80x80 grid.

```gleam
shortest_path(["..", "SG"])
// now:      Ok(2)
// expected: Ok(1)
```
