다음 파이프라인이 계산하는 값을 적으세요. 정수 하나로 답합니다.

```gleam
import gleam/list

[1, 2, 3, 4, 5]
|> list.filter(fn(x) { x % 2 == 1 })
|> list.map(fn(x) { x * 10 })
|> list.fold(0, fn(acc, x) { acc + x })
```
