베이스 문제에서는 실패 이유가 하나(`Nil`)였지만, 이번에는 이유마다 생성자가 있는 `IsbnError`를 돌려줍니다. 검사를 단계 함수로 나누고 `use`로 이으면, 코드의 줄 순서가 곧 "어떤 오류가 먼저 보고되는가"가 됩니다.

```gleam
use chars <- result.try(check_length(chars))    // 1. 길이
use values <- result.try(parse_values(chars))   // 2. 글자
case checksum(values) % 11 {                    // 3. 가중합
  0 -> Ok(values)
  _ -> Error(ChecksumMismatch)
}
```

각 단계는 다음 단계에 필요한 것을 만들어 넘깁니다. 길이 검사를 통과한 글자 목록이 있어야 위치 9의 `X`를 판단할 수 있고, 글자 값 목록이 있어야 가중합을 계산할 수 있습니다. 그래서 순서가 자연스럽게 정해집니다.

`parse_values`에서 `char_value`는 베이스 문제처럼 `Result(Int, Nil)`만 돌려주고, 위치와 글자를 아는 바깥에서 `result.replace_error(InvalidCharacter(index, char))`로 오류를 자세하게 만듭니다.

흔한 실수는 세 가지입니다.

- 원래 문자열에서 위치를 세는 것. 하이픈을 지우기 전에 번호를 붙이면 `"3-598-P1581-X"`의 `P`가 위치 6으로 보고됩니다. 명세의 위치는 하이픈을 지운 뒤의 위치입니다.
- 글자를 먼저 검사하는 것. 11글자짜리 입력에서 길이 대신 글자 오류가 나옵니다.
- `X`를 아무 자리에서나 10으로 받는 것.

실패 이유를 타입으로 나누어 호출한 쪽이 `case`로 처리하게 하는 설계는 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
