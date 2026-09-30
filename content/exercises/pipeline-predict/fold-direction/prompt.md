다음 파이프라인이 계산하는 문자열을 적으세요. 따옴표는 붙여도 되고 생략해도 됩니다.

```gleam
import gleam/list
import gleam/string

["a", "b", "c"]
|> list.index_map(fn(s, i) { string.repeat(s, i + 1) })
|> list.fold("", fn(acc, s) { s <> acc })
```
