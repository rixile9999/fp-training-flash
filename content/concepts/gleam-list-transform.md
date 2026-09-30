---
id: gleam-list-transform
title: 목록 변환 세 가지
language: gleam
source: { kind: original }
---
| 함수 | 하는 일 | 결과 길이 |
|---|---|---|
| `list.map(xs, f)` | 모든 항목에 `f`를 적용한다 | 입력과 같다 |
| `list.filter(xs, keep)` | `keep`이 `True`인 항목만 남긴다 | 같거나 짧다 |
| `list.fold(xs, init, f)` | 항목을 왼쪽부터 하나의 값으로 모은다 | 값 하나 |

```gleam
import gleam/list

list.map([1, 2, 3], fn(x) { x * 2 })        // [2, 4, 6]
list.filter([1, 2, 3], fn(x) { x > 1 })     // [2, 3]
list.fold([1, 2, 3], 0, fn(acc, x) { acc + x }) // 6
```

흔한 실수: "일부만 바꾸기"와 "일부만 남기기"를 혼동한다. 일부만 바꿀 때는 `map` 안에서 `case`로 나눈다.
