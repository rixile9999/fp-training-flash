아래 `apply_coupon`은 배송 대기(`Pending`) 주문에 할인율(%)을 적용하는 함수입니다. 그런데 이 함수를 쓰고 나면 배송 중이거나 취소된 주문이 주문 목록에서 사라진다는 신고가 들어왔습니다. 고치세요.

- `Pending` 주문의 `amount`만 할인한다. 할인 후 금액은 `amount * { 100 - percent } / 100`(정수 나눗셈)이다.
- 다른 주문도 금액을 바꾸지 않고 결과에 그대로 포함한다.
- 원래 순서를 유지한다.

```gleam
apply_coupon([Order(1, Pending, 10000), Order(2, Shipped, 5000)], 10)
// 지금:   [Order(1, Pending, 9000)]
// 기대값: [Order(1, Pending, 9000), Order(2, Shipped, 5000)]
```
