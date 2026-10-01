This time the coupon comes with conditions. Given a list of orders and a coupon, return a new list in which only the amounts of the orders that meet the conditions are discounted.

```gleam
pub type Coupon {
  Coupon(percent: Int, min_amount: Int, max_discount: Int)
}
```

- Discount only orders whose status is `Pending` and whose `amount` is **at least** `min_amount`.
- The discount is `amount * percent / 100`; round **the discount** down by integer division.
- If the discount is greater than `max_discount`, subtract only `max_discount`.
- The amount after the discount is `amount - discount`. Leave the other orders unchanged, and keep the original order.

```gleam
apply_coupon(
  [Order(1, Pending, 80_000), Order(2, Pending, 9000), Order(3, Pending, 999)],
  Coupon(percent: 15, min_amount: 900, max_discount: 5000),
)
// -> [Order(1, Pending, 75_000), Order(2, Pending, 7650), Order(3, Pending, 850)]
// 15% of 80000 is 12000, but only the cap of 5000 is subtracted. 15% of 999 is 149 (rounded down).
```
