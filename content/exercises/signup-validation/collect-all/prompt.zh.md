注册页面希望一次显示所有出错的字段。请实现 `validate_all`，它收集并返回表单中的所有错误。四个按字段检查的函数已经提供。

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
pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError))
```

- 执行全部四项检查。即使前面的检查失败，也不跳过后面的检查。
- 只要有一项失败，就返回包含所有失败检查的错误的 `Error(列表)`。即使只有一个错误，也是列表。
- 错误按用户名、邮箱、密码、年龄的顺序排列。
- 全部通过时，返回不含密码的 `NewUser`。

```gleam
validate_all(SignupForm("mi", "mina@example.com", "s3cret-pw", 12))
// -> Error([UsernameTooShort, Underage])
```
