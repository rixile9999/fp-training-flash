동호회 단체 가입은 명단 전체가 통과해야 접수됩니다. 한 사람의 폼을 검사하는 `validate_all`은 이미 있습니다(실패하면 그 사람의 오류를 모두 모은 목록을 돌려줌). 이를 이용해 명단 전체를 검사하는 `validate_team`을 구현하세요.

```gleam
// 제공됨
pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError))

// 작성할 함수
pub fn validate_team(
  forms: List(SignupForm),
) -> Result(List(NewUser), List(#(Int, List(SignupError))))
```

- 모든 사람이 통과하면 `NewUser`를 명단 순서대로 담아 `Ok`로 반환한다. 빈 명단은 `Ok([])`.
- 한 명이라도 실패하면 실패한 **모든** 사람에 대해 `#(번호, 그 사람의 오류 목록)`을 명단 순서대로 담아 `Error`로 반환한다. 통과한 사람은 넣지 않는다.
- 번호는 명단에서의 위치이며 1부터 센다.

```gleam
validate_team([
  SignupForm("mi", "mina@example.com", "s3cret-pw", 20),
  SignupForm("joon", "joon@example.com", "p4ssword!", 31),
  SignupForm("seo", "seo.example.com", "pw", 12),
])
// -> Error([#(1, [UsernameTooShort]), #(3, [InvalidEmail, PasswordTooShort, Underage])])
```
