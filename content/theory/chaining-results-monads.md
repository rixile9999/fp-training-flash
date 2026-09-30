---
id: chaining-results-monads
title: Result 연결과 모나드
level: advanced
relatedSkills: [explicit-failure]
furtherReading:
  - text: 'Eugenio Moggi, "Notions of computation and monads", Information and Computation 93(1), 1991'
    verified: false
  - text: 'Philip Wadler, "Monads for functional programming", Advanced Functional Programming, LNCS 925, Springer, 1995'
    verified: false
---
실패할 수 있는 단계를 여러 개 이어야 할 때가 많다. 수량을 파싱하고, 가격을 파싱하고, 한도를 검사한다. `case`로 직접 쓰면 단계마다 들여쓰기가 한 단계씩 깊어지고, 모든 층에서 "`Error`면 그대로 돌려준다"는 같은 코드가 반복된다.

이 반복되는 부분을 뽑아낸 것이 `result.try`다.

```text
result.try(Result(a, e), fn(a) -> Result(b, e)) -> Result(b, e)
```

첫 결과가 `Ok(x)`이면 `x`를 다음 단계에 넘기고, `Error(e)`이면 다음 단계를 부르지 않고 `Error(e)`를 그대로 돌려준다(단락 평가). `use` 표현을 쓰면 블록의 나머지가 콜백이 되어 평평하게 읽힌다.

```gleam
import gleam/int
import gleam/result

pub type OrderError {
  BadQuantity(String)
  BadPrice(String)
  OverLimit(Int)
}

pub fn order_total(quantity: String, price: String) -> Result(Int, OrderError) {
  use q <- result.try(
    int.parse(quantity) |> result.replace_error(BadQuantity(quantity)),
  )
  use p <- result.try(int.parse(price) |> result.replace_error(BadPrice(price)))
  check_limit(q * p)
}

fn check_limit(amount: Int) -> Result(Int, OrderError) {
  case amount > 1_000_000 {
    True -> Error(OverLimit(amount))
    False -> Ok(amount)
  }
}
```

`use p <- result.try(r)` 다음 줄들은 `result.try(r, fn(p) { ... })`의 함수 본문과 같다. 문법만 바뀌었을 뿐 중첩된 콜백이라는 사실은 그대로다.

## 왜 모나드인가

오류 타입 `e`를 고정한 `Result(_, e)`에서 `Ok`로 값을 감싸는 연산과 `result.try`는 모나드의 두 연산(return과 bind)이고, 다음 세 법칙을 만족한다.

- 왼쪽 항등: `result.try(Ok(x), f)`는 `f(x)`와 같다.
- 오른쪽 항등: `result.try(r, Ok)`는 `r`과 같다.
- 결합: `result.try(result.try(r, f), g)`는 `result.try(r, fn(x) { result.try(f(x), g) })`와 같다.

법칙은 리팩터링의 근거다. 결합 법칙 덕분에 연결된 단계 중 일부를 떼어 별도 함수로 이름 붙이거나 다시 인라인해도 의미가 변하지 않는다. 항등 법칙은 끝에 `Ok`로 감싸기만 하는 단계가 아무 일도 하지 않는다는 뜻이다.

## map과 try의 구분, 오류 타입 맞추기

다음 단계가 실패하지 않으면 `result.map`, 실패할 수 있으면(`Result`를 돌려주면) `result.try`를 쓴다. `Result`를 돌려주는 함수를 `map`에 넘기면 `Result(Result(b, e), e)`처럼 겹친 타입이 나온다. 이것이 가장 흔한 실수다.

모든 단계는 같은 오류 타입을 공유해야 한다. `int.parse`처럼 `Nil` 오류를 주는 함수는 `result.replace_error`나 `result.map_error`로 도메인 오류로 바꾼 뒤 연결한다.

`result.try`는 **첫 번째** 오류에서 멈춘다. 모든 입력 필드의 오류를 한꺼번에 보여 줘야 한다면 각 검사를 독립적으로 실행해 오류를 목록에 모으는 다른 구조가 필요하다.

## 이 개념이 쓰이는 곳

- 파싱, 검증, 조회, 계산처럼 순서대로 실패할 수 있는 단계를 연결할 때.
- 중첩된 `case` 피라미드를 `use`와 `result.try`로 평평하게 바꾸는 리팩터링에서.
- `Option`의 `option.then`도 같은 모양이다. 값이 없으면 멈추고, 있으면 다음 단계로 넘긴다.
