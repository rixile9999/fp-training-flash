회원가입 폼을 검사해 새 사용자를 만드는 `validate`를 구현하세요. 필드별 검사 함수 네 개는 이미 있습니다.

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
pub fn validate(form: SignupForm) -> Result(NewUser, SignupError)
```

- 아이디, 이메일, 비밀번호, 나이 순서로 검사한다.
- 처음 실패한 검사의 오류 하나만 `Error`로 반환한다.
- 모두 통과하면 비밀번호를 뺀 `NewUser`를 반환한다.
- 검사 규칙은 제공된 `check_` 함수를 사용한다.

```gleam
validate(SignupForm("mina", "mina@example.com", "s3cret-pw", 20))
// -> Ok(NewUser("mina", "mina@example.com", 20))
validate(SignupForm("mi", "mina@example.com", "1234", 10))
// -> Error(UsernameTooShort)
```
