计算批发账单总额的 `invoice_total` 结果正确，但所有规则都混在一个函数里。请把每条规则拆成一个有名字的函数，并把 `invoice_total` 改成组合这些函数。测试会 **分别直接** 调用下面的函数。

| 函数 | 规则 |
|---|---|
| `line_amount(line: Line) -> Int` | `unit_price * quantity`。如果 `quantity` 在 10 及以上，该行打 9 折（`* 90 / 100`，不足 1 韩元的部分舍去） |
| `subtotal(lines: List(Line)) -> Int` | 所有行的 `line_amount` 之和。空列表为 0 |
| `shipping_fee(amount: Int) -> Int` | `amount` 为 0 时为 0，50,000 及以上时为 0，其他情况为 3,000 |
| `vat(amount: Int) -> Int` | `amount` 的 10%（`amount / 10`，不足 1 韩元的部分舍去） |
| `invoice_total(lines: List(Line)) -> Int` | `小计 + vat(小计) + shipping_fee(小计)` |

```gleam
let lines = [Line("A-1", 1200, 3), Line("B-7", 1000, 12)]
line_amount(Line("B-7", 1000, 12))   // -> 10800
subtotal(lines)                      // -> 14400
invoice_total(lines)                 // -> 18840  (14400 + 1440 + 3000)
```
