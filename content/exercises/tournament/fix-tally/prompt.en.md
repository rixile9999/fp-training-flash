A program that builds a football tournament table is split into step functions, but the result is wrong. Find all the bugs and fix them. Don't change the function names or types.

**Rules**

- The input has one match per line (`home team;away team;result`), and the result is `win`, `draw` or `loss` from the home team's point of view. Lines with the wrong format are skipped.
- A win is worth 3 points, a draw 1, and a loss 0. A draw counts as one draw for both teams.
- Rank by points in descending order; if points are equal, by team name in ascending order.
- Row format: team name in 30 columns (left-aligned), and matches played, wins, draws, losses and points in 2 columns each (right-aligned), joined with `" | "`. The first line is the `header`.

**Functions**

- `parse_line`, `format_row`, `tally`: parsing a line, printing a row, and connecting everything
- `record(table, match)`: applies one match to the records of both teams (`Stats(won, drawn, lost)`)
- `points(stats)`: calculates points
- `compare_rows(a, b)`: the sort order (private function)

```gleam
tally("Allegoric Alaskans;Blithering Badgers;draw\nBlithering Badgers;Courageous Californians;win")
```

```text
Team                           | MP |  W |  D |  L |  P
Blithering Badgers             |  2 |  1 |  1 |  0 |  4
Allegoric Alaskans             |  1 |  0 |  1 |  0 |  1
Courageous Californians        |  1 |  0 |  0 |  1 |  0
```
