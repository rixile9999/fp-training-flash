收集一场小型足球赛的比赛结果，生成积分榜字符串。不要全部塞进一个函数，而是拆分成下面这些辅助函数。测试会分别调用每个函数。

**输入**：每行一场比赛，行之间用 `"\n"` 分隔。格式是 `主队;客队;结果`，结果以**主队视角**表示。

- `A;B;win` → A 胜，B 负
- `A;B;loss` → A 负，B 胜
- `A;B;draw` → 双方都是平局

胜一场得 3 分，平局得 1 分，负一场得 0 分。

```gleam
pub type Outcome { Win Draw Loss }
pub type Match { Match(home: String, away: String, outcome: Outcome) }
pub type Stats { Stats(won: Int, drawn: Int, lost: Int) }
pub const header = "Team                           | MP |  W |  D |  L |  P"
```

1. `parse_line(line: String) -> Result(Match, Nil)`：只有按 `;` 分割后恰好是三段、且结果是 `win`、`draw`、`loss` 之一时才返回 `Ok`。其他行（包括空行）返回 `Error(Nil)`。
2. `record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats)`：把一场比赛计入两支球队的战绩。首次出现的球队从 `Stats(0, 0, 0)` 开始。
3. `format_row(team: String, stats: Stats) -> String`：球队名称占 30 格（右侧用空格补齐），接着是比赛场数（MP）、胜、平、负、积分，各占 2 格（左侧用空格补齐），用 `" | "` 连接。
4. `tally(input: String) -> String`：跳过格式错误的行，在 `header` 之后的各行中，按**积分降序、积分相同时按球队名称升序**排列球队行，用 `"\n"` 连接。一场比赛都没有时只返回 `header`。

```gleam
tally("Allegoric Alaskans;Blithering Badgers;win\nBlithering Badgers;Courageous Californians;draw")
```

```text
Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  1 |  1 |  0 |  0 |  3
Blithering Badgers             |  2 |  0 |  1 |  1 |  1
Courageous Californians        |  1 |  0 |  1 |  0 |  1
```
