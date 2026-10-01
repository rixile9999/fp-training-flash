---
id: gleam-case-patterns
title: case 与模式匹配
---
`case` 是根据值的**形状**进行分支的表达式。它从上往下只执行第一个匹配的分支，该分支的值就是整个 `case` 的值。
如果漏掉了某种情况，编译器会报错。

| 模式 | 示例 | 匹配的值 |
|---|---|---|
| 字面量 | `0`、`"vip"` | 恰好是该值 |
| 变量 / 忽略 | `n`、`_` | 任意值（变量会给它起个名字） |
| 列表 | `[]`、`[x]`、`[first, ..rest]` | 空列表、恰好一个、一个及以上 |
| 元组 | `#(a, 0)` | 第二个元素为 `0` 的二元组 |
| 构造器 | `Ok(v)`、`Error(_)`、`Some(x)` | 对应的 variant |
| 字符串前缀 | `"#" <> rest` | 以 `#` 开头的字符串 |
| 多选 | `1 \| 2 \| 3` | 三者之一 |
| 守卫 | `n if n < 0` | 模式匹配且条件也为 `True` |

```gleam
import gleam/int

pub fn describe(xs: List(Int)) -> String {
  case xs {
    [] -> "空"
    [x] if x < 0 -> "一个负数"
    [_] -> "一个"
    [first, ..] -> "第一个值 " <> int.to_string(first)
  }
}

// 要同时检查多个值时，用逗号把它们列出来。
pub fn shipping(region: String, weight: Int) -> Int {
  case region, weight {
    "jeju", _ | "ulleung", _ -> 5000
    _, w if w > 10 -> 4000
    _, _ -> 3000
  }
}
```

常见错误：守卫条件相互重叠的分支顺序放错。如果把 `n if n > 0` 放在 `n if n > 100` 上面，下面的分支永远不会执行，
而且因为带有守卫，编译器也不会发出警告。条件更窄的分支要写在前面。
