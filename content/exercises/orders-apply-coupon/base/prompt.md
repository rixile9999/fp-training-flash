주문 목록과 할인율(%)을 받아, 상태가 `Pending`인 주문의 금액만 할인한 새 목록을 반환하세요.

- `Pending` 주문의 `amount`만 할인한다.
- 다른 주문도 결과에 그대로 포함한다.
- 원래 순서를 유지한다.
- 할인 금액은 정수 나눗셈으로 내림한다.

```gleam
apply_coupon([Order(1, Pending, 10000), Order(2, Shipped, 5000)], 10)
// -> [Order(1, Pending, 9000), Order(2, Shipped, 5000)]
```
