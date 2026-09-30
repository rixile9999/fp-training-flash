문자 메시지 발송 서비스가 북미 번호 체계(NANP)의 전화번호를 받습니다. 사람들이 입력한 여러 모양의 번호를 10자리 숫자로 정리하는 `clean(input: String) -> Result(String, PhoneError)`를 구현하세요.

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}
```

아래 순서로 검사하고, 처음 걸린 검사의 오류를 반환합니다.

1. **글자 검사**: 공백, `(`, `)`, `-`, `.`, `+`는 구분 기호로 보고 지운다. 남은 글자 중 숫자(`0`–`9`)가 아닌 글자가 있으면 `InvalidCharacter(그 글자)`를 반환한다. 여럿이면 입력에서 가장 앞의 글자다.
2. **길이 검사**: 숫자가 10개보다 적으면 `TooFewDigits`, 11개보다 많으면 `TooManyDigits`.
3. **국가 번호**: 숫자가 11개이면 첫 숫자는 국가 번호다. `1`이면 떼어 내고, 아니면 `InvalidCountryCode`.

성공하면 10자리 숫자 문자열을 `Ok`로 반환합니다. 지역 번호 규칙은 이번 문제에서 검사하지 않습니다.

```gleam
clean("+1 (223) 456-7890")  // -> Ok("2234567890")
clean("223-abc-7890")       // -> Error(InvalidCharacter("a"))
clean("22234567890")        // -> Error(InvalidCountryCode)
```
