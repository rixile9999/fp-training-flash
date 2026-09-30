---
id: gleam-anonymous-functions
title: 익명 함수와 함수 캡처
language: gleam
source: { kind: original }
---
Gleam에서 함수는 값이다. 이름 없이 그 자리에서 만들 수도 있고, 이미 있는 함수를 그대로 넘길 수도 있다.

| 문법 | 예 | 뜻 |
|---|---|---|
| 익명 함수 | `fn(x) { x * 2 }` | 인자 `x`를 받아 `x * 2`를 돌려준다 |
| 타입 표기 | `fn(x: Int) -> Int { x * 2 }` | 인자·반환 타입을 적은 형태 |
| 함수 참조 | `int.to_string` | 기존 함수를 값으로 넘긴다 |
| 캡처 | `int.add(_, 10)` | `fn(x) { int.add(x, 10) }`의 줄임 |
| 클로저 | `fn(p) { p * rate }` | 바깥 변수 `rate`를 기억한다 |
| 함수 타입 | `fn(Int) -> Int` | 함수를 받거나 돌려줄 때 쓰는 타입 |

```gleam
import gleam/int
import gleam/list

pub fn multiplier(n: Int) -> fn(Int) -> Int {
  fn(x) { x * n }
}

pub fn examples() {
  let rate = 10
  let discount = fn(price) { price - price * rate / 100 }
  list.map([1000, 2000], discount)    // [900, 1800]
  list.map([1, 2], int.to_string)     // ["1", "2"]
  list.map([1, 2], int.add(_, 10))    // [11, 12]
  list.map([1, 2], multiplier(3))     // [3, 6]
}
```

`multiplier(3)`처럼 설정값을 받아 함수를 만들어 두면, 같은 규칙을 여러 곳에 넘겨 재사용할 수 있다.

흔한 실수: 캡처 `_`로 여러 단계짜리 계산을 만들려고 한다. 캡처는 **호출 하나**만 함수로 바꾼다.
`int.add(_, 1) * 2`는 "1을 더하고 2를 곱하는 함수"가 아니라 함수에 2를 곱하는 식이라 타입 오류가 나고,
`int.add(_, _)`처럼 구멍을 두 개 두는 것도 컴파일되지 않는다. 한 번의 호출이 아니면 `fn(x) { int.add(x, 1) * 2 }`처럼 적는다.
