---
id: gleam-use-expressions
title: use 표현식
language: gleam
source: { kind: original }
---
`use`는 콜백을 마지막 인자로 받는 함수를 평평하게 쓰게 해 주는 문법이다. `use x <- f(a)` 아래에 있는 블록의
**나머지 전부**가 `fn(x) { ... }` 콜백이 되어 `f(a, 콜백)`으로 호출된다.

| `use`로 쓴 형태 | 풀어 쓴 형태 |
|---|---|
| `use x <- result.try(r)` + 나머지 | `result.try(r, fn(x) { 나머지 })` |
| `use x <- option.then(o)` + 나머지 | `option.then(o, fn(x) { 나머지 })` |
| `use <- bool.guard(when: c, return: v)` + 나머지 | `bool.guard(c, v, fn() { 나머지 })` |

```gleam
import gleam/bool
import gleam/int
import gleam/result

pub fn total_price(qty_text: String, price_text: String) -> Result(Int, Nil) {
  use qty <- result.try(int.parse(qty_text))
  use price <- result.try(int.parse(price_text))
  Ok(qty * price)
}
// total_price("3", "1500") == Ok(4500), total_price("x", "1500") == Error(Nil)

pub fn withdraw(balance: Int, amount: Int) -> Result(Int, String) {
  use <- bool.guard(when: amount <= 0, return: Error("금액은 양수여야 한다"))
  use <- bool.guard(when: amount > balance, return: Error("잔액 부족"))
  Ok(balance - amount)
}
```

`result.try`와 함께 쓰면 "앞 단계가 `Error`면 그 자리에서 멈추고 그 오류를 돌려준다"는 흐름이 한 줄씩 읽힌다.
`bool.guard`는 조건이 맞으면 일찍 돌려주는 검사 줄을 만든다. `use`의 범위를 좁히려면 `{ ... }` 블록으로 감싼다.

흔한 실수: 마지막 식을 `Ok(...)`로 감싸지 않는다. 마지막 식은 콜백의 반환값이므로, `result.try`로 이어 온
블록은 `qty * price`가 아니라 `Ok(qty * price)`처럼 Result를 돌려줘야 한다.
