写出下面的管道计算出的值。用一个整数作答。

```gleam
import gleam/list

[1, 2, 3, 4, 5]
|> list.filter(fn(x) { x % 2 == 1 })
|> list.map(fn(x) { x * 10 })
|> list.fold(0, fn(acc, x) { acc + x })
```
