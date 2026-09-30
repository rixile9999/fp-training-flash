---
id: total-vs-partial-functions
title: 전체 함수와 부분 함수
level: basic
relatedSkills: [explicit-failure]
furtherReading:
  - text: 'David A. Turner, "Total Functional Programming", Journal of Universal Computer Science 10(7), 2004'
    verified: false
  - text: 'Alexis King, "Parse, don''t validate" (blog post), 2019'
    url: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
    verified: false
---
**전체 함수**(total function)는 매개변수 타입에 속하는 모든 입력에 대해 결과 타입의 값을 돌려준다. **부분 함수**(partial function)는 일부 입력에서 값을 돌려주지 못한다. 실행이 중단되거나(`panic`, `let assert` 실패) 끝나지 않는다.

시그니처가 `fn(List(Int)) -> Int`인 함수가 빈 목록에서 `panic`하면, 타입은 "어떤 목록이든 정수를 준다"고 말하지만 실제로는 거짓이다. 호출하는 쪽은 시그니처만 보고 이 위험을 알 수 없고, 컴파일러도 도와주지 못한다. 부분 함수를 전체 함수로 바꾸는 방법은 두 가지다.

**1. 결과를 넓힌다.** 값이 없을 수 있음을 결과 타입에 드러낸다. 표준 라이브러리의 `list.first`가 `Result(a, Nil)`을 돌려주는 이유가 이것이다.

```gleam
import gleam/int
import gleam/list

pub fn average(xs: List(Int)) -> Result(Int, Nil) {
  case xs {
    [] -> Error(Nil)
    _ -> Ok(int.sum(xs) / list.length(xs))
  }
}
```

이제 호출하는 쪽은 `Error`를 처리하지 않고는 평균값을 꺼낼 수 없다. 실패 가능성이 타입을 따라 전파된다.

**2. 입력을 좁힌다.** 문제가 되는 입력을 애초에 만들 수 없는 타입을 받는다. 비어 있지 않은 목록을 타입으로 표현하면 최댓값은 항상 존재한다.

```gleam
import gleam/int
import gleam/list

pub type NonEmpty(a) {
  NonEmpty(first: a, rest: List(a))
}

pub fn maximum(xs: NonEmpty(Int)) -> Int {
  list.fold(xs.rest, xs.first, int.max)
}
```

입력을 좁히는 방식은 검사를 한 곳(값을 만드는 경계)으로 모은다. 경계에서 한 번 `Result`로 검증해 `NonEmpty`를 만들면, 그 뒤의 함수들은 같은 검사를 반복하지 않아도 된다.

## 조용한 기본값도 주의한다

Gleam의 정수 나눗셈 `/`는 0으로 나누면 오류 대신 0을 돌려준다(실수 나눗셈 `/.`도 0.0을 돌려준다). 함수는 전체 함수가 되지만, "0으로 나눔"과 "진짜 결과 0"을 구분할 수 없게 된다. 의미 있는 실패라면 `int.divide`처럼 `Result`를 돌려주는 쪽이 낫다. 오류를 임의의 기본값으로 덮는 것은 전체 함수를 만드는 것이 아니라 실패를 숨기는 것이다.

`let assert`와 `panic`은 "이 경우는 절대 일어나지 않는다"는 불변식이 코드로 이미 보장될 때만 쓴다. 사용자 입력, 파일 내용, 외부 응답처럼 경계에서 들어오는 값은 언제든 잘못될 수 있으므로 `Result`로 다룬다.

## 이 개념이 쓰이는 곳

- 빈 목록, 없는 키, 0으로 나누기, 파싱 실패처럼 "값이 없을 수 있는" 연산의 반환 타입을 정할 때.
- `let assert`를 `case`나 `Result`로 바꾸는 리팩터링에서.
- 검증된 값을 전용 타입으로 표현해 이후 함수들의 입력을 좁힐 때.
