`invoice_total`, which calculates the total of a wholesale invoice, gives correct results, but every rule is mixed into one function. Split each rule into a named function and change `invoice_total` to combine those functions. The tests call each of the functions below **directly**.

| Function | Rule |
|---|---|
| `line_amount(line: Line) -> Int` | `unit_price * quantity`. If `quantity` is 10 or more, that line gets a 10% discount (`* 90 / 100`, fractions of a won dropped) |
| `subtotal(lines: List(Line)) -> Int` | Sum of `line_amount` over all lines. An empty list is 0 |
| `shipping_fee(amount: Int) -> Int` | 0 if `amount` is 0, 0 if it is 50,000 or more, otherwise 3,000 |
| `vat(amount: Int) -> Int` | 10% of `amount` (`amount / 10`, fractions of a won dropped) |
| `invoice_total(lines: List(Line)) -> Int` | `subtotal + vat(subtotal) + shipping_fee(subtotal)` |

```gleam
let lines = [Line("A-1", 1200, 3), Line("B-7", 1000, 12)]
line_amount(Line("B-7", 1000, 12))   // -> 10800
subtotal(lines)                      // -> 14400
invoice_total(lines)                 // -> 18840  (14400 + 1440 + 3000)
```
