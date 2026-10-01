The signup screen wants to show every wrong field at once. Implement `validate_all`, which collects and returns every error in the form. The four per-field check functions already exist.

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
pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError))
```

- Run all four checks. Even if an earlier check fails, do not skip the later ones.
- If any check fails, return `Error(list)` containing the errors of every failed check. Even a single error is a list.
- The errors are in the order username, email, password, age.
- If every check passes, return a `NewUser` without the password.

```gleam
validate_all(SignupForm("mi", "mina@example.com", "s3cret-pw", 12))
// -> Error([UsernameTooShort, Underage])
```
