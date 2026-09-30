고객센터가 받은 환불 요청 한 줄 `"주문번호:금액:사유"`를 `RefundRequest`로 바꾸는 `parse_refund`를 구현하세요.

```gleam
pub type Reason {
  Damaged
  Late
  WrongItem
}

pub type RefundRequest {
  RefundRequest(order_id: Int, amount: Int, reason: Reason)
}

pub type RefundError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  InvalidAmount(String)
  UnknownReason(String)
}

pub const max_amount = 1_000_000

pub fn parse_refund(line: String) -> Result(RefundRequest, RefundError)
```

- 줄을 콜론(`:`)으로 나누고 각 필드의 앞뒤 공백을 제거한다. 필드가 정확히 3개가 아니면 `WrongFieldCount(실제 개수)`.
- 주문 번호가 정수가 아니면 `InvalidOrderId(필드)`.
- 금액은 1 이상 `max_amount`(1,000,000) 이하의 정수여야 한다. 아니면 `InvalidAmount(필드)`.
- 사유는 `damaged`, `late`, `wrong_item` 중 하나이며 대소문자를 구분하지 않는다. 각각 `Damaged`, `Late`, `WrongItem`이 된다. 그 밖의 사유는 `UnknownReason(필드)`이고, 필드는 앞뒤 공백만 제거한 채 대소문자를 바꾸지 않고 담는다.
- 검사 순서는 필드 개수, 주문 번호, 금액, 사유다. 먼저 걸린 오류 하나만 반환한다.

```gleam
parse_refund("1001:15000:damaged")  // -> Ok(RefundRequest(1001, 15000, Damaged))
parse_refund("1001:15000:Refused")  // -> Error(UnknownReason("Refused"))
```
