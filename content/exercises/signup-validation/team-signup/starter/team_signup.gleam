import gleam/list
import gleam/string

// ---- 제공된 코드: 한 사람의 가입 폼 검증 ----

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

/// 아이디는 3자 이상이어야 한다.
pub fn check_username(username: String) -> Result(String, SignupError) {
  case string.length(username) >= 3 {
    True -> Ok(username)
    False -> Error(UsernameTooShort)
  }
}

/// 이메일에는 "@"가 있어야 한다.
pub fn check_email(email: String) -> Result(String, SignupError) {
  case string.contains(email, "@") {
    True -> Ok(email)
    False -> Error(InvalidEmail)
  }
}

/// 비밀번호는 8자 이상이어야 한다.
pub fn check_password(password: String) -> Result(Nil, SignupError) {
  case string.length(password) >= 8 {
    True -> Ok(Nil)
    False -> Error(PasswordTooShort)
  }
}

/// 만 14세 이상만 가입할 수 있다.
pub fn check_age(age: Int) -> Result(Int, SignupError) {
  case age >= 14 {
    True -> Ok(age)
    False -> Error(Underage)
  }
}

pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError)) {
  let username = check_username(form.username)
  let email = check_email(form.email)
  let password = check_password(form.password)
  let age = check_age(form.age)
  case username, email, password, age {
    Ok(username), Ok(email), Ok(_), Ok(age) ->
      Ok(NewUser(username:, email:, age:))
    _, _, _, _ ->
      Error(
        list.flatten([
          errors_of(username),
          errors_of(email),
          errors_of(password),
          errors_of(age),
        ]),
      )
  }
}

fn errors_of(result: Result(a, e)) -> List(e) {
  case result {
    Ok(_) -> []
    Error(error) -> [error]
  }
}

// ---- 여기부터 작성합니다 ----

pub fn validate_team(
  forms: List(SignupForm),
) -> Result(List(NewUser), List(#(Int, List(SignupError)))) {
  todo
}
