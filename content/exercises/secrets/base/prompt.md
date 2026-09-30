데이터를 여러 번 변환해 암호화하는 장치의 소프트웨어를 만듭니다. 간단한 연산 함수를 만들고, 그것들을 이어 붙여 복잡한 연산을 만들 수 있어야 합니다. 모든 함수는 숫자가 아니라 **함수**를 돌려줍니다.

- `secret_add(secret)`: 입력 `x`에 `secret`을 더하는 함수 (`x + secret`)
- `secret_subtract(secret)`: 입력 `x`에서 `secret`을 빼는 함수 (`x - secret`)
- `secret_multiply(secret)`: 입력 `x`에 `secret`을 곱하는 함수 (`x * secret`)
- `secret_divide(secret)`: 입력 `x`를 `secret`으로 정수 나눗셈하는 함수 (`x / secret`, 소수점 아래는 버림)
- `secret_combine(f, g)`: 입력 `x`에 `f`를 먼저 적용하고, 그 결과에 `g`를 적용하는 함수

```gleam
let multiply = secret_multiply(7)
let divide = secret_divide(3)
let combined = secret_combine(multiply, divide)
combined(6)
// -> 14  (6 * 7 = 42, 42 / 3 = 14)
```
