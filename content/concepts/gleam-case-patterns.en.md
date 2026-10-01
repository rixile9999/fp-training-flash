---
id: gleam-case-patterns
title: case and pattern matching
---
`case` is an expression that branches on the **shape** of a value. Branches are checked from the top and only the first match runs;
its value becomes the value of the whole `case`. If you leave out a possible case, the compiler reports an error.

| Pattern | Example | Matches |
|---|---|---|
| Literal | `0`, `"vip"` | Exactly that value |
| Variable / discard | `n`, `_` | Anything (a variable also gives it a name) |
| List | `[]`, `[x]`, `[first, ..rest]` | An empty list, exactly one item, one or more items |
| Tuple | `#(a, 0)` | A pair whose second element is `0` |
| Constructor | `Ok(v)`, `Error(_)`, `Some(x)` | That variant |
| String prefix | `"#" <> rest` | A string that starts with `#` |
| Alternatives | `1 \| 2 \| 3` | Any one of the three |
| Guard | `n if n < 0` | The pattern matches and the condition is also `True` |

```gleam
import gleam/int

pub fn describe(xs: List(Int)) -> String {
  case xs {
    [] -> "empty"
    [x] if x < 0 -> "one negative"
    [_] -> "one"
    [first, ..] -> "first value " <> int.to_string(first)
  }
}

// To check several values at once, list them separated by commas.
pub fn shipping(region: String, weight: Int) -> Int {
  case region, weight {
    "jeju", _ | "ulleung", _ -> 5000
    _, w if w > 10 -> 4000
    _, _ -> 3000
  }
}
```

Common mistake: putting branches with overlapping guards in the wrong order. If `n if n > 0` comes before `n if n > 100`, the second
branch can never run, and because guards are involved, the compiler won't warn you either. Write the narrower condition first.
