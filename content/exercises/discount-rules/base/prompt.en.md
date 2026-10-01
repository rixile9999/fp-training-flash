A discount rule is represented as a function `fn(Int) -> Int` that "takes a price and returns a new price". Write two functions that build rules and one function that applies a list of rules.

1. `percent_off(percent: Int) -> fn(Int) -> Int`
   - A rule that takes `percent`% off the price. The result is `price * { 100 - percent } / 100` (integer division, rounded down).
2. `amount_off(amount: Int) -> fn(Int) -> Int`
   - A rule that subtracts `amount` from the price. If the result is less than 0, it is 0.
3. `apply_rules(price: Int, rules: List(fn(Int) -> Int)) -> Int`
   - Applies the rules **in list order**. The result of one rule becomes the input of the next.
   - If there are no rules, returns `price` unchanged.

```gleam
apply_rules(10_000, [percent_off(10), amount_off(1000)])
// 10000 -> 9000 -> 8000
// -> 8000
```
