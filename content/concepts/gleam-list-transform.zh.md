---
id: gleam-list-transform
title: 三种列表转换
---
| 函数 | 作用 | 结果长度 |
|---|---|---|
| `list.map(xs, f)` | 对每一项应用 `f` | 与输入相同 |
| `list.filter(xs, keep)` | 只保留 `keep` 为 `True` 的项 | 相同或更短 |
| `list.fold(xs, init, f)` | 从左往右把各项汇总成一个值 | 一个值 |

```gleam
import gleam/list

list.map([1, 2, 3], fn(x) { x * 2 })        // [2, 4, 6]
list.filter([1, 2, 3], fn(x) { x > 1 })     // [2, 3]
list.fold([1, 2, 3], 0, fn(acc, x) { acc + x }) // 6
```

常见错误：把“只修改一部分”和“只保留一部分”搞混。只修改一部分时，应在 `map` 内部用 `case` 分支处理。
