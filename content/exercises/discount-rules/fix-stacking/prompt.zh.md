这里有一段网店的优惠券计算代码。应用单张优惠券的 `apply_coupon` 是正确的，但使用它的两个函数返回了错误的值。请修复这些 bug。不要修改函数名和类型。

```gleam
pub type Coupon {
  Percent(Int)  // 价格 * { 100 - n } / 100（向下取整）
  Fixed(Int)    // 价格 - n，小于 0 时为 0
}
```

- `apply_all(price, coupons)`：**按列表顺序叠加**应用优惠券后的价格。下一张优惠券应用到上一张的结果上。没有优惠券时为 `price`。
- `best_single(price, coupons)`：**只能用一张**优惠券时的最低价格。没有优惠券时为 `price`。

```gleam
apply_all(10_000, [Percent(10), Fixed(1000)])    // -> 8000
best_single(10_000, [Percent(10), Fixed(2000)])  // -> 8000
```
