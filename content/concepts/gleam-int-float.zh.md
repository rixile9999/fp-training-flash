---
id: gleam-int-float
title: Int 与 Float
---
Gleam 不会在 `Int` 和 `Float` 之间自动转换，连运算符也是分开的：`Int` 使用 `+ - * / %`，
`Float` 使用 `+. -. *. /.` 以及 `<.` 这样的比较运算符。

| 表达式 | 结果 | 说明 |
|---|---|---|
| `7 / 2`、`-7 / 2` | `3`、`-3` | 整数除法向 0 截断 |
| `-7 % 3` | `-1` | 余数的符号跟随被除数，而不是除数 |
| `int.modulo(-7, 3)` | `Ok(2)` | 数学意义上的取模（除以 0 时为 `Error(Nil)`） |
| `5 / 0`、`5.0 /. 0.0` | `0`、`0.0` | 除以 0 也不会抛异常，结果为 0 |
| `int.divide(5, 0)` | `Error(Nil)` | 需要显式处理除以 0 的情况时使用 |
| `int.to_float(3)` | `3.0` | Int → Float |
| `float.round(2.5)`、`float.truncate(2.7)` | `3`、`2` | Float → Int |
| `10_000` | `10000` | 用下划线分隔数位 |

```gleam
import gleam/int
import gleam/list

pub fn discount(price: Int, percent: Int) -> Int {
  price * percent / 100
}
// discount(10_000, 15) == 1500

pub fn average(xs: List(Int)) -> Float {
  case xs {
    [] -> 0.0
    _ -> int.to_float(int.sum(xs)) /. int.to_float(list.length(xs))
  }
}
// average([1, 2]) == 1.5
```

金额要用以最小货币单位（例如“韩元”）计数的 `Int` 来处理，才能避免像 `0.1 +. 0.2` 这样由二进制浮点数带来的误差。`Float` 只用在平均值、比率等确实需要小数的地方。

常见错误：先计算比率。`price * { percent / 100 }` 中的 `percent / 100` 是整数除法，结果为 `0`，
所以整个式子永远是 `0`。应该先乘，最后再除。
