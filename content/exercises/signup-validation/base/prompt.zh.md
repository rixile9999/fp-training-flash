请实现 `validate`，它检查注册表单并创建新用户。四个按字段检查的函数已经提供。

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

// 已提供
pub fn check_username(username: String) -> Result(String, SignupError)  // 至少 3 个字符
pub fn check_email(email: String) -> Result(String, SignupError)        // 包含 "@"
pub fn check_password(password: String) -> Result(Nil, SignupError)     // 至少 8 个字符
pub fn check_age(age: Int) -> Result(Int, SignupError)                  // 年满 14 周岁

// 需要编写的函数
pub fn validate(form: SignupForm) -> Result(NewUser, SignupError)
```

- 按用户名、邮箱、密码、年龄的顺序检查。
- 只用 `Error` 返回第一个失败的检查的那一个错误。
- 全部通过时，返回不含密码的 `NewUser`。
- 检查规则使用已提供的 `check_` 函数。

```gleam
validate(SignupForm("mina", "mina@example.com", "s3cret-pw", 20))
// -> Ok(NewUser("mina", "mina@example.com", 20))
validate(SignupForm("mi", "mina@example.com", "1234", 10))
// -> Error(UsernameTooShort)
```
