Write down the value computed by the following pipeline. Answer with a single integer.

```gleam
import gleam/list

[1, 2, 3, 4, 5]
|> list.filter(fn(x) { x % 2 == 1 })
|> list.map(fn(x) { x * 10 })
|> list.fold(0, fn(acc, x) { acc + x })
```
