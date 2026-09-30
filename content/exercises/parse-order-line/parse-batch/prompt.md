주문 한 줄 `"주문번호,상품코드,수량"`을 해석하는 `parse_line`이 모듈 안에 이미 있습니다(성공하면 `OrderLine`, 실패하면 `ParseError`). 이를 이용해 여러 줄로 된 주문 파일 전체를 해석하는 `parse_batch`를 구현하세요.

```gleam
// 제공됨
pub fn parse_line(line: String) -> Result(OrderLine, ParseError)

// 작성할 부분
pub type BatchError {
  LineError(line_number: Int, error: ParseError)
}

pub fn parse_batch(text: String) -> Result(List(OrderLine), BatchError)
```

- 텍스트를 줄바꿈(`"\n"`)으로 나눈다.
- 앞뒤 공백을 제거했을 때 빈 줄은 건너뛴다. 빈 문자열이면 `Ok([])`.
- 모든 줄이 성공하면 파일의 줄 순서대로 `Ok(목록)`을 반환한다.
- 어떤 줄이 실패하면 가장 앞의 실패한 줄에 대해 `Error(LineError(줄 번호, parse_line의 오류))`를 반환한다.
- 줄 번호는 1부터 세며, 건너뛴 빈 줄도 번호에 포함한다(원래 파일에서의 줄 번호).

```gleam
parse_batch("1001,APPLE-01,3\n\nx,PEAR-02,1")
// -> Error(LineError(3, InvalidOrderId("x")))
```
