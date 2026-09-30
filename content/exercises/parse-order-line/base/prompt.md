주문 파일의 한 줄 `"주문번호,상품코드,수량"`을 `OrderLine`으로 바꾸는 `parse_line`을 구현하세요. 실패하면 무엇이 잘못됐는지 `ParseError`로 알립니다.

```gleam
pub type OrderLine {
  OrderLine(order_id: Int, sku: String, quantity: Int)
}

pub type ParseError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  EmptySku
  InvalidQuantity(String)
}

pub fn parse_line(line: String) -> Result(OrderLine, ParseError)
```

- 줄을 쉼표(`,`)로 나누고, 각 필드의 앞뒤 공백을 제거한 뒤 해석한다.
- 필드가 정확히 3개가 아니면 `WrongFieldCount(실제 필드 개수)`.
- 주문 번호가 정수가 아니면 `InvalidOrderId(필드)`.
- 상품 코드가 빈 문자열이면 `EmptySku`.
- 수량이 정수가 아니거나 1보다 작으면 `InvalidQuantity(필드)`.
- 오류에 담는 필드는 공백을 제거한 값이다.
- 검사 순서는 필드 개수, 주문 번호, 상품 코드, 수량이다. 먼저 걸린 오류 하나만 반환한다.

```gleam
parse_line(" 1001 , APPLE-01 , 3")  // -> Ok(OrderLine(1001, "APPLE-01", 3))
parse_line("1001,APPLE-01,0")       // -> Error(InvalidQuantity("0"))
```
