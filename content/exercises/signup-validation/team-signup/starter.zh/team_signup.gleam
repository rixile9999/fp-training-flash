import gleam/list
import gleam/string

// ---- 已提供的代码：验证一个人的注册表单 ----

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

/// 用户名至少要有 3 个字符。
pub fn check_username(username: String) -> Result(String, SignupError) {
  case string.length(username) >= 3 {
    True -> Ok(username)
    False -> Error(UsernameTooShort)
  }
}

/// 邮箱中必须包含 "@"。
pub fn check_email(email: String) -> Result(String, SignupError) {
  case string.contains(email, "@") {
    True -> Ok(email)
    False -> Error(InvalidEmail)
  }
}

/// 密码至少要有 8 个字符。
pub fn check_password(password: String) -> Result(Nil, SignupError) {
  case string.length(password) >= 8 {
    True -> Ok(Nil)
    False -> Error(PasswordTooShort)
  }
}

/// 只有年满 14 周岁才能注册。
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

// ---- 从这里开始编写 ----

pub fn validate_team(
  forms: List(SignupForm),
) -> Result(List(NewUser), List(#(Int, List(SignupError)))) {
  todo
}
