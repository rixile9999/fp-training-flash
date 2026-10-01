---
id: gleam-pipe-operator
title: The pipe operator |>
---
`|>` passes the value on its left as the **first argument** of the function on its right. It turns nested calls, which you have to read
from the inside out, into a list of steps you read from top to bottom.

| Pipe expression | Same as |
|---|---|
| `x \|> f` | `f(x)` |
| `x \|> f(a)` | `f(x, a)` |
| `x \|> f(a, _)` | `f(a, x)` (goes into the capture `_` slot) |
| `x \|> f \|> g` | `g(f(x))` |

```gleam
import gleam/list
import gleam/string

pub fn normalize(raw: String) -> List(String) {
  raw
  |> string.trim
  |> string.lowercase
  |> string.split(",")
  |> list.map(string.trim)
}
// normalize("  Apple, BANANA ,kiwi ") == ["apple", "banana", "kiwi"]

pub fn greet(name: String) -> String {
  name |> string.append("Hi, ", _)
}
// greet("Minji") == "Hi, Minji"
```

If each step is a function that does just one transformation, the pipeline itself becomes documentation of the processing order.

Common mistake: piping straight into a function whose first argument isn't the value you're passing. `name |> string.append("Hi, ")`
means `string.append(name, "Hi, ")`, so the order comes out reversed. If the value belongs in another slot, mark the position with `_`.
