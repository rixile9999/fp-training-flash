다음 함수들이 정의되어 있습니다.

```gleam
pub fn secret_add(secret: Int) -> fn(Int) -> Int {
  fn(x) { x + secret }
}

pub fn secret_multiply(secret: Int) -> fn(Int) -> Int {
  fn(x) { x * secret }
}

pub fn secret_combine(
  secret_function1: fn(Int) -> Int,
  secret_function2: fn(Int) -> Int,
) -> fn(Int) -> Int {
  fn(x) { secret_function2(secret_function1(x)) }
}
```

아래 코드의 마지막 식이 돌려주는 값을 Gleam 값 표기로 적으세요. (예: `#(1, 2)`)

```gleam
let add3 = secret_add(3)
let double = secret_multiply(2)
let f = secret_combine(add3, double)
let g = secret_combine(double, add3)
#(f(5), g(5))
```
