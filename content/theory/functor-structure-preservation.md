---
id: functor-structure-preservation
title: 구조를 보존하는 변환, 함자
level: basic
relatedSkills: [data-transformation]
furtherReading:
  - text: 'Philip Wadler, "Theorems for free!", FPCA 1989'
    verified: false
---
`map`은 컨테이너의 **모양**은 그대로 두고 안의 값만 바꾼다. 목록이라면 길이와 순서가 모양이다. 이 성질을 가진 구조를 함자(Functor)라고 부르며, 두 법칙으로 표현한다.

```gleam
// 항등 법칙: 아무것도 하지 않는 함수로 map하면 원래 값과 같다
list.map(xs, fn(x) { x }) == xs

// 합성 법칙: 두 번 map하는 것과 합성한 함수로 한 번 map하는 것은 같다
list.map(list.map(xs, g), f) == list.map(xs, fn(x) { f(g(x)) })
```

첫 번째 법칙은 `map`이 항목을 더하거나 빼거나 재배열하지 않는다는 뜻이다. 두 번째 법칙 덕분에 파이프라인의 연속된 `map` 단계를 하나로 합치거나 나눠도 의미가 변하지 않는다.

반대로 `filter`는 모양을 바꾸는 연산이다. 결과 길이가 입력과 다를 수 있으므로 함자 법칙이 성립하지 않는다.

## 이 개념이 쓰이는 곳

- "길이와 순서를 유지하라"는 요구가 있으면 구조를 보존하는 변환이 필요하다.
- `Option`과 `Result`의 `map`도 같은 법칙을 따른다. 값이 있으면 바꾸고, 없거나 오류면 그대로 둔다.
