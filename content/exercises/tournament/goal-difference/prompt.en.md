This league records match scores, and when points are equal, teams are ranked by **goal difference** (goals scored - goals conceded). Build the league table, split into the helper functions below. The tests call each function separately.

**Input**: one match per line, lines separated by `"\n"`. The format is `home team;away team;home goals-away goals` (goals are integers of 0 or more). The team with more goals wins; if equal, it is a draw. A win is worth 3 points, a draw 1, and a loss 0.

```gleam
pub type Match { Match(home: String, away: String, home_goals: Int, away_goals: Int) }
pub type Stats { Stats(won: Int, drawn: Int, lost: Int, goals_for: Int, goals_against: Int) }
pub const header = "Team                 | MP |  W |  D |  L |  GD |  P"
```

1. `parse_line(line: String) -> Result(Match, Nil)`: `Ok` only if splitting on `;` gives three pieces and the score is two integers separated by `-`. Any other line (blank, `3:0`, `x-1` and so on) is `Error(Nil)`.
2. `record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats)`: updates both teams' wins, draws and losses, and their goals scored (`goals_for`) and conceded (`goals_against`). A team seen for the first time starts with everything at 0.
3. `compare_rows(a: #(String, Stats), b: #(String, Stats)) -> Order`: the comparison function to pass to `list.sort`. Points descending → goal difference descending → team name ascending.
4. `format_row(team: String, stats: Stats) -> String`: joins with `" | "` the team name in 20 columns (left-aligned), then matches played, wins, draws and losses in 2 columns each, goal difference in 3 columns and points in 2 columns (all right-aligned). The goal difference is `+2` if positive, `-1` if negative, and `0` if zero.
5. `standings(input: String) -> String`: skips lines with the wrong format, and after the `header` joins the sorted team rows with `"\n"`.

```gleam
standings("Seoul;Busan;2-0\nBusan;Daegu;1-1")
```

```text
Team                 | MP |  W |  D |  L |  GD |  P
Seoul                |  1 |  1 |  0 |  0 |  +2 |  3
Daegu                |  1 |  0 |  1 |  0 |   0 |  1
Busan                |  2 |  0 |  1 |  1 |  -2 |  1
```
