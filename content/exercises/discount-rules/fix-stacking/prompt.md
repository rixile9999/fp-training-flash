쇼핑몰의 쿠폰 계산 코드가 있습니다. 쿠폰 하나를 적용하는 `apply_coupon`은 올바르지만, 이를 이용하는 두 함수가 틀린 값을 돌려줍니다. 버그를 고치세요. 함수 이름과 타입은 바꾸지 마세요.

```gleam
pub type Coupon {
  Percent(Int)  // 가격 * { 100 - n } / 100 (내림)
  Fixed(Int)    // 가격 - n, 0보다 작으면 0
}
```

- `apply_all(price, coupons)`: 쿠폰을 **목록 순서대로 겹쳐** 적용한 가격. 앞 쿠폰의 결과에 다음 쿠폰을 적용한다. 쿠폰이 없으면 `price`.
- `best_single(price, coupons)`: 쿠폰을 **하나만** 쓸 수 있을 때 가장 낮은 가격. 쿠폰이 없으면 `price`.

```gleam
apply_all(10_000, [Percent(10), Fixed(1000)])    // -> 8000
best_single(10_000, [Percent(10), Fixed(2000)])  // -> 8000
```
