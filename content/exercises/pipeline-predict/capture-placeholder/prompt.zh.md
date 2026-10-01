用 Gleam 列表写法（例如 `[1, 2]`）写出下面的管道计算出的值。`int.subtract(a, b)` 就是 `a - b`。

```gleam
import gleam/int
import gleam/list

[1, 2, 3]
|> list.map(int.subtract(10, _))
|> list.map(int.subtract(_, 1))
```
