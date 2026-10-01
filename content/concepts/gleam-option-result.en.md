---
id: gleam-option-result
title: Option and Result
---
Gleam has no `null` and no exceptions. The fact that a value may be missing, or that something may fail, is written in the **type**.

- `Option(a)` = `Some(a) | None`: the value may be missing, and why it's missing doesn't matter.
- `Result(a, e)` = `Ok(a) | Error(e)`: it can fail, and `e` carries the reason for the failure.

| Function | What it does |
|---|---|
| `option.unwrap(opt, default)` / `result.unwrap(r, default)` | Falls back to a default when there's no value |
| `option.map(opt, f)` / `result.map(r, f)` | Transforms only a successful value with `f` |
| `result.try(r, f)` | On success, continues with `f` (a function that returns a Result) |
| `result.map_error(r, f)` / `result.replace_error(r, e)` | Changes the error value |
| `option.to_result(opt, e)` | Turns `None` into `Error(e)` |
| `result.all(rs)` | `Ok(list)` if every item is `Ok`, otherwise the first `Error` |

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
  option.unwrap(nickname, "Guest")
}
```

When a function such as `int.parse` gives you `Error(Nil)` with no reason, convert it to a domain error type before returning it; then
the caller can branch with `case` on each cause of failure.

Common mistake: passing a function that returns a Result to `result.map`. You end up with a nested result such as
`Result(Result(Int, e), e)`. If the next step can also fail, use `result.try`.
