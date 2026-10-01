---
id: gleam-let-assert-panic
title: let assert, panic, todo
---
Every construct below **stops the process immediately** when its condition fails. So use them only for situations that "must never
happen", and return a `Result` for failures you can expect.

| Syntax | Stops when | Use it for |
|---|---|---|
| `let assert [first, ..] = xs` | The value doesn't match the pattern | Unpacking a shape an earlier step already guarantees; tests |
| `let assert Ok(n) = r as "message"` | Same as above, with a message | When you want the cause of the failure in the logs |
| `panic as "message"` | Always, once that line is reached | Branches that are logically unreachable |
| `todo as "message"` | Always, once that line is reached (compile warning) | A placeholder for code you haven't written yet |
| `assert expr` | The expression is `False` | Checks in tests |

```gleam
pub fn first_or_crash(xs: List(Int)) -> Int {
  let assert [first, ..] = xs as "the list can never be empty"
  first
}

pub fn grade_label(score: Int) -> String {
  case score {
    s if s >= 90 -> "A"
    s if s >= 0 -> "B"
    _ -> panic as "the validation step should already have rejected scores below 0"
  }
}
```

`let assert` and `panic` don't show the error in the type, so the caller has no way of knowing the call can fail.
When failure is one of the normal outcomes, as in input validation, use `Result`.

Common mistake: parsing user input with `let assert Ok(n) = int.parse(text)`. A single bad input stops the process, so change it to
return an `Error` with `case` or `result.try`.
