문자 알림 가입 폼에서 `223-45a6-7890`처럼 오타가 섞인 번호가 그대로 가입되는 문제가 발견되었습니다. 번호 정리 함수 `clean`이 숫자가 아닌 글자를 모두 조용히 지우기 때문입니다. 코드를 고치세요.

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}
```

올바른 동작은 다음 순서의 검사입니다. 처음 걸린 검사의 오류를 반환합니다.

1. **글자 검사**: 공백, `(`, `)`, `-`, `.`, `+`만 구분 기호로 보고 지운다. 남은 글자 중 숫자가 아닌 글자가 있으면 `InvalidCharacter(그 글자)`를 반환한다. 여럿이면 입력에서 가장 앞의 글자다.
2. **길이 검사**: 숫자가 10개보다 적으면 `TooFewDigits`, 11개보다 많으면 `TooManyDigits`.
3. **국가 번호**: 11자리면 첫 숫자가 `1`일 때 떼어 내고, 아니면 `InvalidCountryCode`.

길이와 국가 번호 처리(`normalize_length`)는 이미 올바릅니다.

```gleam
clean("223-45a6-7890")  // -> Error(InvalidCharacter("a"))   (지금은 Ok("2234567890"))
clean("223.456.7890")   // -> Ok("2234567890")
```
