장바구니 금액을 계산하는 모듈입니다. 공개 함수 `line_total`과 `cart_total`은 `Result`를 돌려주지만, 안쪽 도우미 함수 `parse_line`과 `price_of`가 `let assert`로 멈추고 `cart_total`도 `let assert`로 줄마다의 결과를 꺼냅니다. 잘못된 줄 하나가 결제 요청 전체를 죽입니다.

모든 `let assert`를 없애고, 실패를 `CheckoutError` 값으로 공개 함수까지 전달하도록 고치세요. 도우미 함수의 시그니처는 바꿔도 됩니다.

```gleam
pub type CheckoutError {
  BadLine(String)
  BadQuantity(String)
  UnknownSku(String)
}

pub fn line_total(prices: Dict(String, Int), line: String) -> Result(Int, CheckoutError)
pub fn cart_total(prices: Dict(String, Int), lines: List(String)) -> Result(Int, CheckoutError)
```

- 주문 줄은 `"SKU x 수량"` 형식이다. `" x "`로 나눠 정확히 두 조각이 아니면 `Error(BadLine(줄 전체))`.
- 수량이 정수가 아니거나 1보다 작으면 `Error(BadQuantity(수량 부분))`.
- 가격표에 없는 상품이면 `Error(UnknownSku(상품 코드))`.
- 검사 순서는 줄 형식, 수량, 상품이다.
- `cart_total`은 줄 순서대로 계산하며, 실패한 줄이 있으면 첫 번째 실패의 오류를 반환한다. 빈 장바구니는 `Ok(0)`.

```gleam
// 가격표: APPLE=1200, PEAR=2500
line_total(prices, "APPLE x 3")               // -> Ok(3600)
cart_total(prices, ["APPLE x 1", "KIWI x 2"]) // 지금: 크래시   고친 뒤: Error(UnknownSku("KIWI"))
```
