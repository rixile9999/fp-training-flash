Implement `validate`, which checks a signup form and builds a new user. The four per-field check functions already exist.

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

// Provided
pub fn check_username(username: String) -> Result(String, SignupError)  // at least 3 characters
pub fn check_email(email: String) -> Result(String, SignupError)        // contains "@"
pub fn check_password(password: String) -> Result(Nil, SignupError)     // at least 8 characters
pub fn check_age(age: Int) -> Result(Int, SignupError)                  // age 14 or older

// Function to write
pub fn validate(form: SignupForm) -> Result(NewUser, SignupError)
```

- Check in the order username, email, password, age.
- Return only the error of the first failing check, in `Error`.
- If every check passes, return a `NewUser` without the password.
- Use the provided `check_` functions for the validation rules.

```gleam
validate(SignupForm("mina", "mina@example.com", "s3cret-pw", 20))
// -> Ok(NewUser("mina", "mina@example.com", 20))
validate(SignupForm("mi", "mina@example.com", "1234", 10))
// -> Error(UsernameTooShort)
```
