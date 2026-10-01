下面的 `apply_coupon` 用来对待发货（`Pending`）订单应用折扣率（%）。但有人报告说，用过这个函数之后，配送中或已取消的订单从订单列表里消失了。请修复它。

- 只对 `Pending` 订单的 `amount` 打折。打折后的金额为 `amount * { 100 - percent } / 100`（整数除法）。
- 其他订单也不改金额，原样包含在结果中。
- 保持原来的顺序。

```gleam
apply_coupon([Order(1, Pending, 10000), Order(2, Shipped, 5000)], 10)
// 现在：  [Order(1, Pending, 9000)]
// 期望值：[Order(1, Pending, 9000), Order(2, Shipped, 5000)]
```
