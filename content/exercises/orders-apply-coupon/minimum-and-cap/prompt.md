이번 쿠폰에는 조건이 붙습니다. 주문 목록과 쿠폰을 받아, 조건에 맞는 주문의 금액만 할인한 새 목록을 반환하세요.

```gleam
pub type Coupon {
  Coupon(percent: Int, min_amount: Int, max_discount: Int)
}
```

- 상태가 `Pending`이고 `amount`가 `min_amount` **이상**인 주문만 할인한다.
- 할인액은 `amount * percent / 100`이며 정수 나눗셈으로 **할인액을** 내림한다.
- 할인액이 `max_discount`보다 크면 `max_discount`만큼만 뺀다.
- 할인 후 금액은 `amount - 할인액`이다. 나머지 주문은 그대로 두고, 원래 순서를 유지한다.

```gleam
apply_coupon(
  [Order(1, Pending, 80_000), Order(2, Pending, 9000), Order(3, Pending, 999)],
  Coupon(percent: 15, min_amount: 900, max_discount: 5000),
)
// -> [Order(1, Pending, 75_000), Order(2, Pending, 7650), Order(3, Pending, 850)]
// 80000의 15%는 12000이지만 한도 5000만 뺀다. 999의 15%는 149(내림)다.
```
