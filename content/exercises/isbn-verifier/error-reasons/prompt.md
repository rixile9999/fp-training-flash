도서 등록 화면에서 ISBN이 틀렸을 때 "틀렸습니다"만 보여 주니 사서들이 어디를 고쳐야 할지 모릅니다. 틀린 이유를 알려 주는 `validate`를 구현하세요.

```gleam
pub type IsbnError {
  WrongLength(length: Int)
  InvalidCharacter(position: Int, found: String)
  ChecksumMismatch
}

pub fn validate(isbn: String) -> Result(List(Int), IsbnError)
```

하이픈(`-`)을 모두 지운 뒤 아래 순서로 검사하고, 처음 걸린 검사의 오류를 반환합니다.

1. **길이**: 글자가 10개가 아니면 `WrongLength(글자 수)`.
2. **글자**: 앞 9글자는 숫자, 마지막 글자는 숫자 또는 대문자 `X`(값 10)여야 한다. 아니면 `InvalidCharacter(position, found)`. `position`은 **하이픈을 지운 뒤** 0부터 센 위치이고, 여럿이면 가장 앞의 글자다.
3. **가중합**: `d₁×10 + d₂×9 + … + d₁₀×1`이 11로 나누어떨어지지 않으면 `ChecksumMismatch`.

모두 통과하면 글자 값 10개의 목록을 `Ok`로 반환합니다.

```gleam
validate("3-598-21507-X")  // -> Ok([3, 5, 9, 8, 2, 1, 5, 0, 7, 10])
validate("3-598-P1581-X")  // -> Error(InvalidCharacter(position: 4, found: "P"))
validate("3-598-21507")    // -> Error(WrongLength(9))
```
