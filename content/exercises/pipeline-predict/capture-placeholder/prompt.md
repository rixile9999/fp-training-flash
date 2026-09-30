다음 파이프라인이 계산하는 값을 Gleam 목록 표기(예: `[1, 2]`)로 적으세요. `int.subtract(a, b)`는 `a - b`입니다.

```gleam
import gleam/int
import gleam/list

[1, 2, 3]
|> list.map(int.subtract(10, _))
|> list.map(int.subtract(_, 1))
```
