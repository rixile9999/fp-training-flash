The `apply_coupon` below applies a discount rate (%) to pending (`Pending`) orders. But there is a report that after using this function, orders that are being shipped or were cancelled disappear from the order list. Fix it.

- Discount only the `amount` of `Pending` orders. The amount after the discount is `amount * { 100 - percent } / 100` (integer division).
- Include the other orders in the result as well, without changing their amounts.
- Keep the original order.

```gleam
apply_coupon([Order(1, Pending, 10000), Order(2, Shipped, 5000)], 10)
// now:      [Order(1, Pending, 9000)]
// expected: [Order(1, Pending, 9000), Order(2, Shipped, 5000)]
```
