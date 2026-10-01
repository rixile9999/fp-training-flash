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

/// The username must be at least 3 characters long.
pub fn check_username(username: String) -> Result(String, SignupError) {
  case string.length(username) >= 3 {
    True -> Ok(username)
    False -> Error(UsernameTooShort)
  }
}

/// The email must contain "@".
pub fn check_email(email: String) -> Result(String, SignupError) {
  case string.contains(email, "@") {
    True -> Ok(email)
    False -> Error(InvalidEmail)
  }
}

/// The password must be at least 8 characters long.
pub fn check_password(password: String) -> Result(Nil, SignupError) {
  case string.length(password) >= 8 {
    True -> Ok(Nil)
    False -> Error(PasswordTooShort)
  }
}

/// Only people aged 14 or older can sign up.
pub fn check_age(age: Int) -> Result(Int, SignupError) {
  case age >= 14 {
    True -> Ok(age)
    False -> Error(Underage)
  }
}

pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError)) {
  todo
}
