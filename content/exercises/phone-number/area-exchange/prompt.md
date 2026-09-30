베이스 문제의 정리 단계는 이제 `normalize(input: String) -> Result(String, PhoneError)`라는 이름으로 starter에 들어 있습니다. 이번에는 NANP 번호의 두 규칙을 **별도의 검사 함수**로 추가하고, `clean`에서 단계를 이어 붙입니다.

10자리 번호 `NXX NXX-XXXX`에서 앞 세 자리는 지역 번호, 다음 세 자리는 교환 번호입니다. 두 코드 모두 첫 숫자가 `2`–`9`여야 합니다.

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
  InvalidAreaCode(first: String)
  InvalidExchangeCode(first: String)
}
```

다음 세 함수를 구현하세요. 두 검사 함수는 `normalize`를 통과한 10자리 숫자 문자열을 받는다고 가정합니다.

- `check_area_code(number: String) -> Result(String, PhoneError)`: 첫 번째 숫자(위치 0)가 `"0"` 또는 `"1"`이면 `InvalidAreaCode(그 숫자)`, 아니면 `Ok(number)`.
- `check_exchange_code(number: String) -> Result(String, PhoneError)`: 네 번째 숫자(위치 3)가 `"0"` 또는 `"1"`이면 `InvalidExchangeCode(그 숫자)`, 아니면 `Ok(number)`.
- `clean(input: String) -> Result(String, PhoneError)`: `normalize` → `check_area_code` → `check_exchange_code` 순서로 적용하고, 처음 실패한 단계의 오류를 반환한다.

```gleam
check_exchange_code("2231567890")  // -> Error(InvalidExchangeCode("1"))
clean("1 (223) 456-7890")          // -> Ok("2234567890")
clean("(023) 156-7890")            // -> Error(InvalidAreaCode("0"))
```
