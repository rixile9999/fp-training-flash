청구서 계산을 단계 함수로 나눴는데, 고객 문의가 들어왔습니다. 대량 주문과 정확히 5만 원짜리 주문, 빈 청구서의 총액이 틀리게 나온다고 합니다. 단계 함수들은 모두 올바릅니다. `invoice_total`을 고치세요.

규칙(단계 함수에 이미 구현됨):

- `line_amount`: `unit_price * quantity`, 수량 10 이상이면 그 줄 10% 할인(원 미만 버림)
- `subtotal`: 모든 줄의 `line_amount` 합
- `shipping_fee(amount)`: 0원이면 0, 50,000원 이상이면 0, 그 밖에는 3,000
- `vat(amount)`: `amount / 10`
- `invoice_total`: `소계 + vat(소계) + shipping_fee(소계)`

```gleam
invoice_total([Line("B-7", 1000, 12)])
// -> 14880  (10800 + 1080 + 3000)
```
