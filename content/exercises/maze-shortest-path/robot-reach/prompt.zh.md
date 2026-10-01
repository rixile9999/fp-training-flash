在仓库地面的网格上，统计机器人从起点格子 `S` 出发、移动不超过 `max_steps` 次能到达多少个格子。

```gleam
pub fn reachable_count(floor: List(String), max_steps: Int) -> Int
```

- 每个字符串是一行。`S` 是机器人的位置，`#` 是货架（不能通过），`.` 是通道。
- 机器人每次向上下左右移动一格，不能走进货架或走出网格。
- 起点格子也要计算（移动 0 次）。每个格子只计算一次。`max_steps` 大于或等于 0。
- 没有 `S` 时返回 0。

模块下方已经准备好了工具：由两个列表构成的不可变队列（`new_queue`、`push`、`pop`），把网格转换成 `Dict(Pos, String)` 的 `parse_grid`，查找字符位置的 `find_cell`，以及返回可移动邻格的 `open_neighbors`。`Pos` 是 `#(行, 列)`。

```gleam
reachable_count([
  ".#..",
  "S#..",
  "....",
], 3)
// -> 5   S（0 次），S 上方和下方的格子（1 次），最下面一行的第二格（2 次），第三格（3 次）
```
