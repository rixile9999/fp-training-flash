用 Gleam 列表写法（例如 `[1, 2]`）写出下面的管道计算出的值。

```gleam
import gleam/list
import gleam/string

"  Hello, Gleam World  "
|> string.trim
|> string.lowercase
|> string.split(" ")
|> list.map(string.length)
```
