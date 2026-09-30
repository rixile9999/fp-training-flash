할인 규칙을 "가격을 받아 새 가격을 돌려주는 함수" `fn(Int) -> Int`로 표현합니다. 규칙을 만드는 함수 두 개와 규칙 목록을 적용하는 함수 하나를 작성하세요.

1. `percent_off(percent: Int) -> fn(Int) -> Int`
   - 가격을 `percent`% 깎는 규칙. 결과는 `price * { 100 - percent } / 100` (정수 나눗셈으로 내림).
2. `amount_off(amount: Int) -> fn(Int) -> Int`
   - 가격에서 `amount`를 빼는 규칙. 결과가 0보다 작으면 0.
3. `apply_rules(price: Int, rules: List(fn(Int) -> Int)) -> Int`
   - 규칙을 **목록 순서대로** 적용한다. 앞 규칙의 결과가 다음 규칙의 입력이 된다.
   - 규칙이 없으면 `price`를 그대로 돌려준다.

```gleam
apply_rules(10_000, [percent_off(10), amount_off(1000)])
// 10000 -> 9000 -> 8000
// -> 8000
```
