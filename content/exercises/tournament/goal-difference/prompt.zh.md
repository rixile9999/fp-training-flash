这次的联赛会记录比赛比分，积分相同时按**净胜球**（进球 - 失球）决定排名。请把积分榜拆分成下面这些辅助函数来实现。测试会分别调用每个函数。

**输入**：每行一场比赛，行之间用 `"\n"` 分隔。格式是 `主队;客队;主队进球-客队进球`（进球数是大于等于 0 的整数）。进球多的球队获胜，相同则为平局。胜 3 分，平 1 分，负 0 分。

```gleam
pub type Match { Match(home: String, away: String, home_goals: Int, away_goals: Int) }
pub type Stats { Stats(won: Int, drawn: Int, lost: Int, goals_for: Int, goals_against: Int) }
pub const header = "Team                 | MP |  W |  D |  L |  GD |  P"
```

1. `parse_line(line: String) -> Result(Match, Nil)`：只有按 `;` 分割后是三段、且比分是用 `-` 分隔的两个整数时才返回 `Ok`。其他行（空行、`3:0`、`x-1` 等）返回 `Error(Nil)`。
2. `record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats)`：更新两支球队的胜平负以及进球（`goals_for`）、失球（`goals_against`）。首次出现的球队所有数值都从 0 开始。
3. `compare_rows(a: #(String, Stats), b: #(String, Stats)) -> Order`：传给 `list.sort` 的比较函数。积分降序 → 净胜球降序 → 球队名称升序。
4. `format_row(team: String, stats: Stats) -> String`：球队名称占 20 格（左对齐），比赛场数、胜、平、负各占 2 格，净胜球占 3 格，积分占 2 格（都右对齐），用 `" | "` 连接。净胜球为正时写成 `+2`，为负时写成 `-1`，为 0 时写成 `0`。
5. `standings(input: String) -> String`：跳过格式错误的行，在 `header` 之后用 `"\n"` 连接排好序的球队行。

```gleam
standings("Seoul;Busan;2-0\nBusan;Daegu;1-1")
```

```text
Team                 | MP |  W |  D |  L |  GD |  P
Seoul                |  1 |  1 |  0 |  0 |  +2 |  3
Daegu                |  1 |  0 |  1 |  0 |   0 |  1
Busan                |  2 |  0 |  1 |  1 |  -2 |  1
```
