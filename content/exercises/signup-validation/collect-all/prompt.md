가입 화면에서는 틀린 필드를 한 번에 모두 표시하려 합니다. 폼의 오류를 모두 모아 반환하는 `validate_all`을 구현하세요. 필드별 검사 함수 네 개는 이미 있습니다.

```gleam
pub type SignupForm {
  SignupForm(username: String, email: String, password: String, age: Int)
}

pub type NewUser {
  NewUser(username: String, email: String, age: Int)
}

pub type SignupError {
  UsernameTooShort
  InvalidEmail
  PasswordTooShort
  Underage
}

// 제공됨
pub fn check_username(username: String) -> Result(String, SignupError)  // 3자 이상
pub fn check_email(email: String) -> Result(String, SignupError)        // "@" 포함
pub fn check_password(password: String) -> Result(Nil, SignupError)     // 8자 이상
pub fn check_age(age: Int) -> Result(Int, SignupError)                  // 14세 이상

// 작성할 함수
pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError))
```

- 네 검사를 모두 실행한다. 앞 검사가 실패해도 뒤 검사를 건너뛰지 않는다.
- 하나라도 실패하면 실패한 검사의 오류를 모두 담은 `Error(목록)`을 반환한다. 오류가 하나여도 목록이다.
- 오류 순서는 아이디, 이메일, 비밀번호, 나이 순이다.
- 모두 통과하면 비밀번호를 뺀 `NewUser`를 반환한다.

```gleam
validate_all(SignupForm("mi", "mina@example.com", "s3cret-pw", 12))
// -> Error([UsernameTooShort, Underage])
```
