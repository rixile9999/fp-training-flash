Write down the string computed by the following pipeline. You may include the quotation marks or leave them out.

```gleam
import gleam/list
import gleam/string

["a", "b", "c"]
|> list.index_map(fn(s, i) { string.repeat(s, i + 1) })
|> list.fold("", fn(acc, s) { s <> acc })
```
