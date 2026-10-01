Here is the coupon calculation code of an online shop. `apply_coupon`, which applies one coupon, is correct, but the two functions that use it return wrong values. Fix the bugs. Do not change the function names or types.

```gleam
pub type Coupon {
  Percent(Int)  // price * { 100 - n } / 100 (rounded down)
  Fixed(Int)    // price - n, or 0 if that is less than 0
}
```

- `apply_all(price, coupons)`: the price after **stacking** the coupons **in list order**. Each coupon is applied to the result of the previous one. With no coupons, `price`.
- `best_single(price, coupons)`: the lowest price when **only one** coupon can be used. With no coupons, `price`.

```gleam
apply_all(10_000, [Percent(10), Fixed(1000)])    // -> 8000
best_single(10_000, [Percent(10), Fixed(2000)])  // -> 8000
```
