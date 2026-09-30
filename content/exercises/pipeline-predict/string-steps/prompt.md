다음 파이프라인이 계산하는 값을 Gleam 목록 표기(예: `[1, 2]`)로 적으세요.

```gleam
import gleam/list
import gleam/string

"  Hello, Gleam World  "
|> string.trim
|> string.lowercase
|> string.split(" ")
|> list.map(string.length)
```
