오류 타입 `PhoneError`는 실패 이유마다 생성자가 하나씩 있습니다. 호출한 쪽은 `case`로 원인을 나눠 "영문자는 입력할 수 없습니다", "번호가 너무 짧습니다"처럼 다른 안내를 보여 줄 수 있습니다. 오류를 `String`이나 `Nil`로 뭉개면 이 구분이 사라집니다. `InvalidCharacter`처럼 필요한 정보(문제의 글자)를 생성자에 담을 수도 있습니다.

검사가 여러 개일 때는 "어떤 오류가 먼저 보고되는가"도 명세입니다. 단계를 함수로 나누고 `use`로 이으면 코드의 줄 순서가 곧 검사 순서가 됩니다.

```gleam
pub fn clean(input: String) -> Result(String, PhoneError) {
  use digits <- result.try(extract_digits(input))  // 1. 글자 검사
  normalize_length(digits)                         // 2. 길이, 3. 국가 번호
}
```

- `extract_digits`는 구분 기호를 지운 뒤 `list.try_map`으로 글자마다 숫자인지 확인합니다. `try_map`은 첫 실패에서 멈추므로 "가장 앞의 잘못된 글자"가 저절로 보고됩니다.
- `normalize_length`는 숫자 개수와 목록 모양을 함께 `case`로 나눕니다. `11, ["1", ..rest]` 패턴 하나로 "11자리이고 1로 시작함"을 확인하면서 국가 번호를 떼어 냅니다.

흔한 실수는 세 가지입니다.

- 숫자만 남기고 나머지를 모두 버리는 것(`list.filter(is_digit)`). `"523-abc-7890"`처럼 잘못된 입력이 숫자 개수만 맞으면 통과하거나, 엉뚱한 길이 오류로 보고됩니다.
- 길이를 먼저 검사하는 것. `"555-12x"`는 글자 오류가 먼저여야 하는데 `TooFewDigits`가 나옵니다.
- 11자리 초과를 따로 막지 않고 "11자리 이상이면 국가 번호 검사"로 처리하는 것. 12자리 번호가 `InvalidCountryCode`나 잘못된 성공으로 바뀝니다.

실패 이유를 대수적 자료형으로 표현하는 이유는 이론 노트 "합 타입과 빠짐없는 분기"(algebraic-data-types)과 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
