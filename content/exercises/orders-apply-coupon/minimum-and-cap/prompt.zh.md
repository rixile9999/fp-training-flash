这次的优惠券带有条件。给定订单列表和优惠券，返回一个新列表：只对满足条件的订单金额打折。

```gleam
pub type Coupon {
  Coupon(percent: Int, min_amount: Int, max_discount: Int)
}
```

- 只对状态为 `Pending` 且 `amount` **不低于** `min_amount` 的订单打折。
- 折扣额为 `amount * percent / 100`，用整数除法对**折扣额**向下取整。
- 折扣额大于 `max_discount` 时，只扣减 `max_discount`。
- 打折后的金额为 `amount - 折扣额`。其余订单保持原样，并保持原来的顺序。

```gleam
apply_coupon(
  [Order(1, Pending, 80_000), Order(2, Pending, 9000), Order(3, Pending, 999)],
  Coupon(percent: 15, min_amount: 900, max_discount: 5000),
)
// -> [Order(1, Pending, 75_000), Order(2, Pending, 7650), Order(3, Pending, 850)]
// 80000 的 15% 是 12000，但只扣减上限 5000。999 的 15% 是 149（向下取整）。
```
