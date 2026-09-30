---
id: function-composition-pipelines
title: 함수 합성과 파이프라인
level: basic
relatedSkills: [function-decomposition]
furtherReading:
  - text: 'John Hughes, "Why Functional Programming Matters", The Computer Journal 32(2), 1989'
    verified: false
  - text: 'Richard Bird, "Thinking Functionally with Haskell", Cambridge University Press, 2014'
    verified: false
---
함수 `f: a -> b`와 `g: b -> c`가 있으면, 먼저 `f`를 적용하고 그 결과에 `g`를 적용하는 새 함수 `a -> c`를 만들 수 있다. 이것이 **함수 합성**이다. 큰 변환을 작은 변환의 연속으로 표현하는 가장 기본적인 방법이다.

Gleam의 파이프 연산자 `|>`는 합성을 데이터가 흐르는 순서대로 쓰게 해 준다. `x |> f |> g`는 `g(f(x))`와 같다. 왼쪽 값은 오른쪽 함수의 **첫 번째 인자**로 들어가며, `f(a, _)` 같은 함수 캡처로 다른 위치에 넣을 수도 있다.

```gleam
import gleam/list
import gleam/string

pub fn normalize(tag: String) -> String {
  tag |> string.trim |> string.lowercase
}

pub fn parse_tags(raw: String) -> List(String) {
  raw
  |> string.split(",")
  |> list.map(normalize)
  |> list.filter(fn(tag) { tag != "" })
}
```

`parse_tags(" Gleam, FP ,,beam ")`는 `["gleam", "fp", "beam"]`이다. 각 단계는 한 가지 일만 하고, 이름만 읽어도 전체 흐름이 보인다.

## 왜 잘 나눠지는가

- **타입이 접착제다**: 한 단계의 출력 타입이 다음 단계의 입력 타입과 맞아야 이어진다. 단계를 잘못 끼우면 컴파일러가 알려 준다.
- **결합법칙**: 합성은 묶는 방법과 상관없이 결과가 같다. 그래서 `trim`과 `lowercase` 두 단계를 `normalize`라는 이름으로 묶어도, 다시 풀어도 의미가 같다. 파이프라인을 테스트 가능한 조각으로 나누는 근거다.
- **각 단계를 따로 검증한다**: `normalize`만 따로 테스트하고, `parse_tags`는 단계 연결만 확인하면 된다.

이 플랫폼이 쓰는 gleam_stdlib 1.0.5의 `gleam/function` 모듈에는 `identity`만 있고 합성 함수는 없다. 하지만 함수도 값이므로 직접 만들기 쉽다.

```gleam
pub fn compose(f: fn(a) -> b, g: fn(b) -> c) -> fn(a) -> c {
  fn(x) { g(f(x)) }
}
```

## 주의할 점

- **순서가 의미를 바꿀 수 있다**: 합성은 교환법칙이 성립하지 않는다. 빈 태그를 먼저 거르고 공백을 다듬으면 `" "` 같은 태그가 필터를 통과한 뒤 빈 문자열이 되어 결과에 남는다. 각 단계가 어떤 입력을 가정하는지 확인하고 순서를 정한다.
- **한 단계에 한 가지 일**: 한 단계가 파싱과 필터링을 함께 하면 이름을 붙이기 어렵고 재사용도 어렵다.
- **효과는 끝으로**: 중간 단계에서 출력을 하면 단계를 합치거나 옮길 때 효과의 횟수와 순서가 바뀐다. 순수한 단계들을 잇고, 효과는 파이프라인 끝에서 한 번 수행한다.
- **데이터를 첫 매개변수로**: 직접 만드는 함수도 처리할 데이터를 첫 번째 매개변수로 두면 파이프에 자연스럽게 끼워진다.

## 이 개념이 쓰이는 곳

- 문자열 정규화, 입력 정리, 보고서 생성처럼 여러 단계를 거치는 변환.
- 긴 함수를 이름 있는 단계들로 나누고 파이프라인으로 다시 연결하는 리팩터링.
- 파이프라인의 결과를 예측하는 문제에서 각 단계의 입력과 출력을 차례로 따라갈 때.
