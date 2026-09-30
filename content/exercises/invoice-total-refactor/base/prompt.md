도매 청구서의 총액을 계산하는 `invoice_total`은 결과는 맞지만 모든 규칙이 한 함수에 섞여 있습니다. 규칙마다 이름 있는 함수로 나누고, `invoice_total`은 그 함수들을 조합하도록 바꾸세요. 테스트는 아래 함수를 **각각 직접** 호출합니다.

| 함수 | 규칙 |
|---|---|
| `line_amount(line: Line) -> Int` | `unit_price * quantity`. `quantity`가 10 이상이면 그 줄을 10% 할인(`* 90 / 100`, 원 미만 버림) |
| `subtotal(lines: List(Line)) -> Int` | 모든 줄의 `line_amount` 합. 빈 목록은 0 |
| `shipping_fee(amount: Int) -> Int` | `amount`가 0이면 0, 50,000 이상이면 0, 그 밖에는 3,000 |
| `vat(amount: Int) -> Int` | `amount`의 10% (`amount / 10`, 원 미만 버림) |
| `invoice_total(lines: List(Line)) -> Int` | `소계 + vat(소계) + shipping_fee(소계)` |

```gleam
let lines = [Line("A-1", 1200, 3), Line("B-7", 1000, 12)]
line_amount(Line("B-7", 1000, 12))   // -> 10800
subtotal(lines)                      // -> 14400
invoice_total(lines)                 // -> 18840  (14400 + 1440 + 3000)
```
