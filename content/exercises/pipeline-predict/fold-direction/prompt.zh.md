写出下面的管道计算出的字符串。可以带引号，也可以省略。

```gleam
import gleam/list
import gleam/string

["a", "b", "c"]
|> list.index_map(fn(s, i) { string.repeat(s, i + 1) })
|> list.fold("", fn(acc, s) { s <> acc })
```
