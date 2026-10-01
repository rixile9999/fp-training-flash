---
id: gleam-option-result
title: Option 与 Result
---
Gleam 没有 `null`，也没有异常。值可能不存在、操作可能失败，这些事实都写在**类型**里。

- `Option(a)` = `Some(a) | None`：值可能不存在，至于为什么不存在并不重要。
- `Result(a, e)` = `Ok(a) | Error(e)`：可能失败，`e` 中装着失败的原因。

| 函数 | 作用 |
|---|---|
| `option.unwrap(opt, default)` / `result.unwrap(r, default)` | 没有值时使用默认值 |
| `option.map(opt, f)` / `result.map(r, f)` | 只用 `f` 转换成功的值 |
| `result.try(r, f)` | 成功时继续交给 `f`（返回 Result 的函数） |
| `result.map_error(r, f)` / `result.replace_error(r, e)` | 修改错误值 |
| `option.to_result(opt, e)` | 把 `None` 变成 `Error(e)` |
| `result.all(rs)` | 全部为 `Ok` 时得到 `Ok(列表)`，否则得到第一个 `Error` |

```gleam
import gleam/int
import gleam/option.{type Option}
import gleam/result

pub type AgeError {
  NotANumber
  Negative
}

pub fn parse_age(text: String) -> Result(Int, AgeError) {
  int.parse(text)
  |> result.replace_error(NotANumber)
  |> result.try(fn(n) {
    case n < 0 {
      True -> Error(Negative)
      False -> Ok(n)
    }
  })
}
// parse_age("42") == Ok(42), parse_age("abc") == Error(NotANumber), parse_age("-3") == Error(Negative)

pub fn display_name(nickname: Option(String)) -> String {
  option.unwrap(nickname, "访客")
}
```

对于像 `int.parse` 这样只给出 `Error(Nil)`、不说明原因的函数，先把它的结果转换成领域错误类型再返回，
调用方就能按失败原因用 `case` 分别处理。

常见错误：把返回 Result 的函数传给 `result.map`。这样会得到 `Result(Result(Int, e), e)` 这样嵌套的结果。
如果下一步也可能失败，就用 `result.try`。
