一个生成足球赛积分榜的程序已经拆分成了各个步骤函数，但结果不对。请找出所有 bug 并修复。不要修改函数名和类型。

**规则**

- 输入每行一场比赛（`主队;客队;结果`），结果是以主队视角表示的 `win`、`draw`、`loss`。格式错误的行跳过。
- 胜 3 分，平 1 分，负 0 分。平局时两队各记一次平局。
- 按积分降序排名，积分相同时按球队名称升序。
- 行格式：球队名称占 30 格（左对齐），比赛场数、胜、平、负、积分各占 2 格（右对齐），用 `" | "` 连接。第一行是 `header`。

**函数**

- `parse_line`、`format_row`、`tally`：解析行、输出行、整体连接
- `record(table, match)`：把一场比赛计入两支球队的战绩（`Stats(won, drawn, lost)`）
- `points(stats)`：计算积分
- `compare_rows(a, b)`：排序依据（私有函数）

```gleam
tally("Allegoric Alaskans;Blithering Badgers;draw\nBlithering Badgers;Courageous Californians;win")
```

```text
Team                           | MP |  W |  D |  L |  P
Blithering Badgers             |  2 |  1 |  1 |  0 |  4
Allegoric Alaskans             |  1 |  0 |  1 |  0 |  1
Courageous Californians        |  1 |  0 |  0 |  1 |  0
```
