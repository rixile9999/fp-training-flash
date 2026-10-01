网店的结算页面不再只显示一个总额，而是要显示分项明细。起始代码中的 `checkout_total` 是只计算总额的现有函数。参考其中的规则后，可以删掉它，或者改成返回 `summarize(lines, tier).total`。请实现下面的函数。测试会直接调用每个函数。

| 函数 | 规则 |
|---|---|
| `subtotal(lines: List(Line)) -> Int` | 所有行的 `price * quantity` 之和 |
| `member_discount(tier: Tier, amount: Int) -> Int` | `Basic` 0%，`Silver` 3%，`Gold` 5%。`amount * 比例 / 100`（不足 1 韩元的部分舍去） |
| `shipping_fee(amount: Int) -> Int` | 0 韩元时为 0，30,000 韩元及以上时为 0，其他情况为 2,500 |
| `summarize(lines: List(Line), tier: Tier) -> Summary` | 按下面的顺序计算，并汇总成 `Summary` |

`summarize` 的计算顺序：

1. `subtotal` = 小计
2. `discount` = `member_discount(tier, 小计)`
3. 折后金额 = 小计 − 折扣额
4. `shipping` = `shipping_fee(折后金额)`
5. `vat` = 折后金额 / 10（运费不征增值税）
6. `total` = 折后金额 + 运费 + 增值税

```gleam
summarize([Line("马克杯", 12_000, 2), Line("咖啡豆", 9_000, 1)], Gold)
// -> Summary(subtotal: 33_000, discount: 1650, shipping: 0, vat: 3135, total: 34_485)
```
