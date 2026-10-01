Collect the match results of a small football tournament and build a league table string. Don't put everything in one function; split it into the helper functions below. The tests call each function separately.

**Input**: one match per line, lines separated by `"\n"`. The format is `home team;away team;result`, and the result is **from the home team's point of view**.

- `A;B;win` → A wins, B loses
- `A;B;loss` → A loses, B wins
- `A;B;draw` → both draw

A win is worth 3 points, a draw 1, and a loss 0.

```gleam
pub type Outcome { Win Draw Loss }
pub type Match { Match(home: String, away: String, outcome: Outcome) }
pub type Stats { Stats(won: Int, drawn: Int, lost: Int) }
pub const header = "Team                           | MP |  W |  D |  L |  P"
```

1. `parse_line(line: String) -> Result(Match, Nil)`: `Ok` only if splitting on `;` gives exactly three pieces and the result is one of `win`, `draw` or `loss`. Any other line (including a blank one) is `Error(Nil)`.
2. `record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats)`: applies one match to the records of both teams. A team seen for the first time starts from `Stats(0, 0, 0)`.
3. `format_row(team: String, stats: Stats) -> String`: puts the team name in 30 columns (padded with spaces on the right), followed by matches played (MP), wins, draws, losses and points, each in 2 columns (padded with spaces on the left), joined with `" | "`.
4. `tally(input: String) -> String`: skips lines with the wrong format, and after the `header` line places the team rows **in descending order of points, and in ascending order of team name on ties**, joined with `"\n"`. If there are no matches at all, returns only the `header`.

```gleam
tally("Allegoric Alaskans;Blithering Badgers;win\nBlithering Badgers;Courageous Californians;draw")
```

```text
Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  1 |  1 |  0 |  0 |  3
Blithering Badgers             |  2 |  0 |  1 |  1 |  1
Courageous Californians        |  1 |  0 |  1 |  0 |  1
```
