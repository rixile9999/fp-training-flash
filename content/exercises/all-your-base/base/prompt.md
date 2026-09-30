어떤 진법으로 적힌 자릿수 목록을 받아, 같은 수를 다른 진법의 자릿수 목록으로 바꾸는 `rebase`를 구현하세요. 잘못된 입력은 `Error`로 알립니다.

```gleam
pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn rebase(
  digits digits: List(Int),
  input_base input_base: Int,
  output_base output_base: Int,
) -> Result(List(Int), RebaseError)
```

- `digits`는 높은 자리부터 적힌 `input_base` 진법의 자릿수다. 결과도 높은 자리부터, 앞자리 0 없이 반환한다.
- 수의 값이 0이면(빈 목록, `[0, 0, 0]` 등) 결과는 `Ok([0])`이다.
- 진법이 2보다 작으면 `Error(InvalidBase(그 진법))`을 반환한다.
- 자릿수가 0보다 작거나 `input_base` 이상이면 `Error(InvalidDigit(그 자릿수))`를 반환한다. 잘못된 자릿수가 여럿이면 가장 앞의 것을 알린다.
- 검사 순서는 입력 진법, 출력 진법, 자릿수 순이다. 먼저 걸린 오류 하나만 반환한다.
- 변환은 직접 구현한다(`int.digits`, `int.undigits`를 쓰지 않는다).

```gleam
rebase(digits: [1, 0, 1, 0, 1, 0], input_base: 2, output_base: 10)
// -> Ok([4, 2])        (2진수 101010 = 42)
rebase(digits: [1, 2], input_base: 2, output_base: 10)
// -> Error(InvalidDigit(2))
```
