给定订单列表和折扣率（%），返回一个新列表：只对状态为 `Pending` 的订单金额打折。

- 只对 `Pending` 订单的 `amount` 打折。
- 其他订单也原样包含在结果中。
- 保持原来的顺序。
- 打折后的金额为 `amount * { 100 - percent } / 100`，用整数除法向下取整。

```gleam
apply_coupon([Order(1, Pending, 10000), Order(2, Shipped, 5000)], 10)
// -> [Order(1, Pending, 9000), Order(2, Shipped, 5000)]
```
