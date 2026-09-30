import gleam/result
import gleam/string

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
  {
    use username <- result.try(check_username(form.username))
    use email <- result.try(check_email(form.email))
    use _ <- result.try(check_password(form.password))
    use age <- result.try(check_age(form.age))
    Ok(NewUser(username:, email:, age:))
  }
  |> result.map_error(fn(error) { [error] })
}
