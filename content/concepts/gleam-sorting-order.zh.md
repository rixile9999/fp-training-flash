---
id: gleam-sorting-order
title: 排序与 Order
---
`list.sort(xs, by: compare)` 使用一个比较两个值并返回 `Order`（`Lt`、`Eq`、`Gt`）的函数来排序。
`Lt` 表示第一个值排在前面。比较结果为 `Eq` 的项保持原来的顺序（稳定排序）。

| 函数 | 作用 |
|---|---|
| `int.compare`、`float.compare`、`string.compare` | 默认的升序比较 |
| `order.reverse(int.compare)` | 把比较函数反转，得到降序 |
| `fn(a, b) { int.compare(b, a) }` | 交换参数顺序，得到降序 |
| `order.break_tie(first, second)` | 只有 `first` 为 `Eq` 时才由 `second` 决定 |
| `order.negate(o)` | 互换 `Lt` 和 `Gt` |

```gleam
import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Player {
  Player(name: String, score: Int)
}

// 按分数降序；分数相同时按名字升序
pub fn ranking(players: List(Player)) -> List(Player) {
  list.sort(players, fn(a, b) {
    int.compare(b.score, a.score)
    |> order.break_tie(string.compare(a.name, b.name))
  })
}
// ranking([Player("c", 10), Player("a", 20), Player("b", 10)])
//   == [Player("a", 20), Player("b", 10), Player("c", 10)]
```

排序标准有多个时，用 `break_tie` 或 `case ... { order.Eq -> 下一个标准  other -> other }` 按优先级串起来。

常见错误：先按升序排序，再用 `list.reverse` 得到降序。这样连分数相同的项原来的顺序也会被颠倒。
降序应该通过反转比较函数本身来实现。
