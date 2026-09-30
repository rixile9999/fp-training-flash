온라인 몰의 결제 화면이 총액 하나 대신 항목별 명세서를 보여 주게 되었습니다. 시작 코드의 `checkout_total`은 총액만 계산하는 기존 함수입니다. 규칙을 참고한 뒤 지우거나 `summarize(lines, tier).total`을 돌려주도록 바꾸세요. 아래 함수를 구현하세요. 테스트는 각 함수를 직접 호출합니다.

| 함수 | 규칙 |
|---|---|
| `subtotal(lines: List(Line)) -> Int` | 모든 줄의 `price * quantity` 합 |
| `member_discount(tier: Tier, amount: Int) -> Int` | `Basic` 0%, `Silver` 3%, `Gold` 5%. `amount * 비율 / 100` (원 미만 버림) |
| `shipping_fee(amount: Int) -> Int` | 0원이면 0, 30,000원 이상이면 0, 그 밖에는 2,500 |
| `summarize(lines: List(Line), tier: Tier) -> Summary` | 아래 순서로 계산해 `Summary`로 모은다 |

`summarize` 계산 순서:

1. `subtotal` = 소계
2. `discount` = `member_discount(tier, 소계)`
3. 할인 후 금액 = 소계 − 할인액
4. `shipping` = `shipping_fee(할인 후 금액)`
5. `vat` = 할인 후 금액 / 10 (배송비에는 부가세가 없다)
6. `total` = 할인 후 금액 + 배송비 + 부가세

```gleam
summarize([Line("머그컵", 12_000, 2), Line("원두", 9_000, 1)], Gold)
// -> Summary(subtotal: 33_000, discount: 1650, shipping: 0, vat: 3135, total: 34_485)
```
