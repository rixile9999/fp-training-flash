---
id: gleam-int-float
title: Int and Float
---
Gleam never converts between `Int` and `Float` automatically. They even have separate operators: `Int` uses `+ - * / %`, while
`Float` uses `+. -. *. /.` and comparisons such as `<.`.

| Expression | Result | Notes |
|---|---|---|
| `7 / 2`, `-7 / 2` | `3`, `-3` | Integer division truncates toward 0 |
| `-7 % 3` | `-1` | The remainder takes the sign of the dividend, not the divisor |
| `int.modulo(-7, 3)` | `Ok(2)` | Mathematical modulo (`Error(Nil)` when dividing by 0) |
| `5 / 0`, `5.0 /. 0.0` | `0`, `0.0` | Dividing by 0 gives 0, with no exception |
| `int.divide(5, 0)` | `Error(Nil)` | For when you want to handle division by 0 explicitly |
| `int.to_float(3)` | `3.0` | Int → Float |
| `float.round(2.5)`, `float.truncate(2.7)` | `3`, `2` | Float → Int |
| `10_000` | `10000` | Underscores to separate digits |

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

Keep money as an `Int` in whole won (the smallest currency unit); that way you avoid the binary floating-point errors behind things like `0.1 +. 0.2`. Use `Float` only where you truly need fractions, such as averages and ratios.

Common mistake: dividing the rate first. `price * { percent / 100 }` is always `0`, because `percent / 100` is integer division and
becomes `0`. Multiply first and divide last.
