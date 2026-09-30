---
id: gleam-pipe-operator
title: 파이프 연산자 |>
language: gleam
source: { kind: original }
---
`|>`는 왼쪽 값을 오른쪽 함수의 **첫 번째 인자**로 넘긴다. 안쪽부터 읽어야 하는 중첩 호출을 위에서 아래로
읽히는 단계 목록으로 바꿔 준다.

| 파이프 식 | 같은 뜻 |
|---|---|
| `x \|> f` | `f(x)` |
| `x \|> f(a)` | `f(x, a)` |
| `x \|> f(a, _)` | `f(a, x)` (캡처 `_` 자리로 들어간다) |
| `x \|> f \|> g` | `g(f(x))` |

```gleam
import gleam/list
import gleam/string

pub fn normalize(raw: String) -> List(String) {
  raw
  |> string.trim
  |> string.lowercase
  |> string.split(",")
  |> list.map(string.trim)
}
// normalize("  Apple, BANANA ,kiwi ") == ["apple", "banana", "kiwi"]

pub fn greet(name: String) -> String {
  name |> string.append("안녕, ", _)
}
// greet("민지") == "안녕, 민지"
```

단계마다 함수 하나가 한 가지 변환만 하도록 나누면, 파이프라인 자체가 처리 순서를 설명하는 문서가 된다.

흔한 실수: 넘길 값이 첫 번째 인자가 아닌 함수에 그대로 파이프한다. `name |> string.append("안녕, ")`은
`string.append(name, "안녕, ")`이라서 순서가 뒤집힌다. 다른 자리에 넣어야 하면 `_`로 위치를 지정한다.
