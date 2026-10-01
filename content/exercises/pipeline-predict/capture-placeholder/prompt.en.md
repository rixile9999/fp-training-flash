Write down the value computed by the following pipeline in Gleam list notation (for example `[1, 2]`). `int.subtract(a, b)` is `a - b`.

```gleam
import gleam/int
import gleam/list

[1, 2, 3]
|> list.map(int.subtract(10, _))
|> list.map(int.subtract(_, 1))
```
