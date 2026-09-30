암호화 장치가 여러 단계의 연산을 설정 목록으로 받게 되었습니다. `secret_add`, `secret_subtract`, `secret_multiply`, `secret_divide`, `secret_combine`은 시작 코드에 이미 구현되어 있습니다. 두 함수를 추가하세요.

1. `secret_combine_all(fns: List(fn(Int) -> Int)) -> fn(Int) -> Int`
   - 목록의 **첫 번째 함수부터** 차례로 적용하는 함수를 돌려준다.
   - 빈 목록이면 입력을 그대로 돌려주는 함수를 돌려준다.
2. `secret_repeat(f: fn(Int) -> Int, times: Int) -> fn(Int) -> Int`
   - `f`를 `times`번 연달아 적용하는 함수를 돌려준다.
   - `times`가 0 이하이면 입력을 그대로 돌려주는 함수를 돌려준다.

가능하면 이미 있는 `secret_combine`과 `secret_combine_all`을 재사용하세요.

```gleam
let f = secret_combine_all([secret_add(2), secret_multiply(10), secret_subtract(1)])
f(1)   // -> 29  ((1 + 2) * 10 - 1)

let g = secret_repeat(secret_multiply(2), 3)
g(1)   // -> 8
```
