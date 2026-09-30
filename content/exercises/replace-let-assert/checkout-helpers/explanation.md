`let assert`가 도우미 함수 안에 있으면 고치는 범위가 넓어집니다. `parse_line`의 반환 타입 `#(String, Int)`는 "항상 성공한다"고 말하고 있어서, 실패를 알릴 통로가 없기 때문입니다. 그래서 해답은 **가장 안쪽부터 타입을 바꿉니다.**

1. `price_of`는 `Result(Int, CheckoutError)`를 돌려줍니다. `dict.get`의 `Error(Nil)`을 `UnknownSku(sku)`로 바꾸기만 하면 됩니다.
2. `parse_line`은 `case string.split(line, " x ")`로 조각 수를 확인해 `BadLine`을 만들고, 수량 해석과 범위 검사를 `parse_quantity`로 분리해 `BadQuantity`를 만듭니다.
3. `line_total`은 두 도우미를 `use ... <- result.try(...)`로 연결합니다. 순서가 곧 검사 순서입니다.
4. `cart_total`의 `fold` 안 `let assert`는 `list.try_fold`로 바꿉니다. 줄마다 `Error`가 나오면 그 자리에서 멈추고 그 오류가 결과가 됩니다.

실패 가능성이 타입에 나타나면 컴파일러가 호출하는 모든 곳에서 처리를 요구합니다. 도우미가 `Result`를 돌려주도록 바꾸는 순간 `line_total`이 컴파일되지 않으므로, 빠뜨린 곳을 컴파일러가 알려 줍니다. 부분 함수를 전체 함수로 바꾸는 이 과정이 **전체 함수와 부분 함수(total-vs-partial-functions)** 주제이고, `use`와 `try_fold`로 실패를 이어 전달하는 방식은 **Result 연결과 모나드** 주제입니다.

자주 하는 실수:

- 크래시를 없애려고 없는 상품의 가격을 `result.unwrap(0)`으로 0원 처리한다. 결제 금액이 조용히 틀립니다.
- `cart_total`에서 `result.values`로 성공한 줄만 더한다. 잘못된 줄이 합계에서 빠진 채 결제가 진행됩니다.
- `let assert True = quantity >= 1`을 지우기만 하고 범위 검사를 옮기지 않는다.
