Write down the value computed by the following pipeline in Gleam list notation (for example `[1, 2]`).

```gleam
import gleam/list
import gleam/string

"  Hello, Gleam World  "
|> string.trim
|> string.lowercase
|> string.split(" ")
|> list.map(string.length)
```
