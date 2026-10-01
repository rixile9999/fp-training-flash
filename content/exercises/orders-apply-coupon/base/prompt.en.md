Given a list of orders and a discount rate (%), return a new list in which only the amounts of orders with status `Pending` are discounted.

- Discount only the `amount` of `Pending` orders.
- Include the other orders in the result unchanged.
- Keep the original order.
- The amount after the discount is `amount * { 100 - percent } / 100`, rounded down by integer division.

```gleam
apply_coupon([Order(1, Pending, 10000), Order(2, Shipped, 5000)], 10)
// -> [Order(1, Pending, 9000), Order(2, Shipped, 5000)]
```
