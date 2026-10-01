把折扣规则表示为“接收价格、返回新价格”的函数 `fn(Int) -> Int`。请编写两个创建规则的函数，以及一个应用规则列表的函数。

1. `percent_off(percent: Int) -> fn(Int) -> Int`
   - 把价格减去 `percent`% 的规则。结果为 `price * { 100 - percent } / 100`（整数除法，向下取整）。
2. `amount_off(amount: Int) -> fn(Int) -> Int`
   - 从价格中减去 `amount` 的规则。结果小于 0 时为 0。
3. `apply_rules(price: Int, rules: List(fn(Int) -> Int)) -> Int`
   - **按列表顺序**应用规则。前一条规则的结果成为下一条规则的输入。
   - 没有规则时原样返回 `price`。

```gleam
apply_rules(10_000, [percent_off(10), amount_off(1000)])
// 10000 -> 9000 -> 8000
// -> 8000
```
