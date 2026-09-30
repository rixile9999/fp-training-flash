---
id: gleam-option-result
title: Option과 Result
language: gleam
source: { kind: original }
---
Gleam에는 `null`과 예외가 없다. 값이 없을 수 있거나 실패할 수 있다는 사실을 **타입**에 적는다.

- `Option(a)` = `Some(a) | None`: 값이 없을 수 있다. 없는 이유는 중요하지 않다.
- `Result(a, e)` = `Ok(a) | Error(e)`: 실패할 수 있고, `e`에 실패 이유를 담는다.

| 함수 | 하는 일 |
|---|---|
| `option.unwrap(opt, default)` / `result.unwrap(r, default)` | 값이 없으면 기본값 |
| `option.map(opt, f)` / `result.map(r, f)` | 성공한 값만 `f`로 바꾼다 |
| `result.try(r, f)` | 성공하면 `f`(Result를 돌려주는 함수)로 이어 간다 |
| `result.map_error(r, f)` / `result.replace_error(r, e)` | 오류 값을 바꾼다 |
| `option.to_result(opt, e)` | `None`을 `Error(e)`로 바꾼다 |
| `result.all(rs)` | 전부 `Ok`면 `Ok(목록)`, 아니면 첫 `Error` |

```gleam
import gleam/int
import gleam/option.{type Option}
import gleam/result

pub type AgeError {
  NotANumber
  Negative
}

pub fn parse_age(text: String) -> Result(Int, AgeError) {
  int.parse(text)
  |> result.replace_error(NotANumber)
  |> result.try(fn(n) {
    case n < 0 {
      True -> Error(Negative)
      False -> Ok(n)
    }
  })
}
// parse_age("42") == Ok(42), parse_age("abc") == Error(NotANumber), parse_age("-3") == Error(Negative)

pub fn display_name(nickname: Option(String)) -> String {
  option.unwrap(nickname, "손님")
}
```

`int.parse`처럼 이유 없이 `Error(Nil)`을 주는 함수의 결과는 도메인 오류 타입으로 바꿔서 돌려주면, 호출하는 쪽이
실패 원인별로 `case`를 나눌 수 있다.

흔한 실수: Result를 돌려주는 함수를 `result.map`에 넘긴다. 그러면 `Result(Result(Int, e), e)`처럼 겹친
결과가 나온다. 다음 단계도 실패할 수 있으면 `result.try`를 쓴다.
