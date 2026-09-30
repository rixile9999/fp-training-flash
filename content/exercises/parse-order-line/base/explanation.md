한 줄을 해석하는 일은 "필드 나누기 → 주문 번호 → 상품 코드 → 수량"의 연속이고, 각 단계가 실패할 수 있습니다. 해답은 이 구조를 그대로 코드로 옮깁니다.

1. `string.split`과 `list.map(string.trim)`으로 필드를 만든 뒤, `case`의 `[a, b, c]` 패턴으로 개수를 검사합니다. 개수가 틀린 경우는 나머지 패턴 하나로 모아 `WrongFieldCount(list.length(fields))`를 돌려줍니다.
2. 필드마다 `Result(값, ParseError)`를 돌려주는 작은 함수(`parse_order_id`, `parse_sku`, `parse_quantity`)를 둡니다. `int.parse`는 실패 이유 없이 `Error(Nil)`만 주므로 `result.replace_error`로 이 문제의 오류로 바꿉니다.
3. `use x <- result.try(...)`로 세 결과를 연결합니다. 앞 단계가 `Error`이면 뒤 단계는 실행되지 않으므로 "첫 오류만 반환"이 저절로 지켜집니다.

`use`가 없으면 `case`가 세 겹으로 중첩됩니다. `result.try`는 "성공하면 다음 계산에 값을 넘기고, 실패하면 그대로 전달"하는 연결 규칙이고, 이것이 **Result 연결과 모나드(chaining-results-monads)** 주제의 내용입니다. 오류를 `ParseError`라는 커스텀 타입으로 정의하면 호출하는 쪽이 `case`로 원인별 처리를 할 수 있습니다(**오류도 값이다**, **합 타입과 빠짐없는 분기** 주제).

자주 하는 실수:

- 공백 제거를 빠뜨려 `" 3"`을 `int.parse`가 거부하게 만든다.
- `int.parse`가 성공했다는 것만 확인하고 `수량 >= 1` 범위 검사를 빠뜨린다. `case`의 가드(`Ok(q) if q >= 1`)로 두 조건을 한 번에 표현할 수 있습니다.
- 빈 상품 코드를 그대로 받아들인다. 문자열로 해석되는 필드도 규칙이 있으면 검사해야 합니다.
