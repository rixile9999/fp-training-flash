社团的集体注册只有在整份名单都通过时才会受理。检查一个人表单的 `validate_all` 已经提供（失败时返回收集了这个人所有错误的列表）。请利用它实现检查整份名单的 `validate_team`。

```gleam
// 已提供
pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError))

// 需要编写的函数
pub fn validate_team(
  forms: List(SignupForm),
) -> Result(List(NewUser), List(#(Int, List(SignupError))))
```

- 所有人都通过时，按名单顺序把 `NewUser` 放进 `Ok` 返回。空名单为 `Ok([])`。
- 只要有一个人失败，就对失败的**所有**人按名单顺序放入 `#(编号, 这个人的错误列表)`，用 `Error` 返回。通过的人不放进去。
- 编号是在名单中的位置，从 1 开始计数。

```gleam
validate_team([
  SignupForm("mi", "mina@example.com", "s3cret-pw", 20),
  SignupForm("joon", "joon@example.com", "p4ssword!", 31),
  SignupForm("seo", "seo.example.com", "pw", 12),
])
// -> Error([#(1, [UsernameTooShort]), #(3, [InvalidEmail, PasswordTooShort, Underage])])
```
