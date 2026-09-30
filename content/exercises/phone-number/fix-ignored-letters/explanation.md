버그는 `list.filter(is_digit)` 한 줄입니다. 숫자가 아닌 글자를 모두 버리므로, 허용된 구분 기호뿐 아니라 오타(`a`)나 엉뚱한 기호(`#`)도 함께 사라집니다. 그 뒤의 길이 검사는 숫자만 보므로 잘못된 입력을 올바른 번호로 받아들입니다.

"버려도 되는 글자"와 "알려야 하는 글자"를 나누는 것이 핵심입니다.

```gleam
fn extract_digits(input: String) -> Result(List(String), PhoneError) {
  input
  |> string.to_graphemes
  |> list.filter(fn(char) { !is_separator(char) })   // 구분 기호만 버린다
  |> list.try_map(fn(char) {                          // 나머지는 숫자여야 한다
    case is_digit(char) {
      True -> Ok(char)
      False -> Error(InvalidCharacter(char))
    }
  })
}
```

`clean`은 `use digits <- result.try(extract_digits(input))`로 글자 검사를 먼저 통과해야만 길이 검사로 넘어갑니다. 그래서 `"555-12x"`는 길이 오류가 아니라 `InvalidCharacter("x")`가 됩니다.

고치면서 흔히 생기는 실수는 세 가지입니다.

- 영문자만 찾아서 막는 것. `#` 같은 기호는 여전히 조용히 사라집니다. 막을 목록 대신 허용할 목록(구분 기호와 숫자)을 기준으로 삼으면 빠뜨리는 글자가 없습니다.
- 구분 기호까지 모두 잘못된 글자로 보는 것. `"+1 (223) 456-7890"` 같은 정상 입력이 거부됩니다.
- 기존의 숫자 개수 검사를 먼저 하고 글자 검사를 나중에 붙이는 것. 검사 순서가 명세와 달라집니다.

잘못된 입력을 버리지 않고 오류 값으로 전달하는 이유는 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
