---
id: gleam-sorting-order
title: 정렬과 Order
language: gleam
source: { kind: original }
---
`list.sort(xs, by: compare)`는 두 값을 비교해 `Order`(`Lt`, `Eq`, `Gt`)를 돌려주는 함수로 정렬한다.
`Lt`면 첫 번째 값이 앞에 온다. 비교 결과가 `Eq`인 항목들은 원래 순서를 유지한다(안정 정렬).

| 함수 | 하는 일 |
|---|---|
| `int.compare`, `float.compare`, `string.compare` | 기본 오름차순 비교 |
| `order.reverse(int.compare)` | 비교 함수를 뒤집어 내림차순으로 |
| `fn(a, b) { int.compare(b, a) }` | 인자 순서를 바꿔 내림차순으로 |
| `order.break_tie(first, second)` | `first`가 `Eq`일 때만 `second`로 결정 |
| `order.negate(o)` | `Lt`와 `Gt`를 바꾼다 |

```gleam
import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Player {
  Player(name: String, score: Int)
}

// 점수 내림차순, 점수가 같으면 이름 오름차순
pub fn ranking(players: List(Player)) -> List(Player) {
  list.sort(players, fn(a, b) {
    int.compare(b.score, a.score)
    |> order.break_tie(string.compare(a.name, b.name))
  })
}
// ranking([Player("c", 10), Player("a", 20), Player("b", 10)])
//   == [Player("a", 20), Player("b", 10), Player("c", 10)]
```

정렬 기준이 여러 개면 `break_tie`나 `case ... { order.Eq -> 다음 기준  other -> other }`로 우선순위대로 잇는다.

흔한 실수: 오름차순으로 정렬한 뒤 `list.reverse`로 내림차순을 만든다. 그러면 점수가 같은 항목들의 원래
순서까지 뒤집힌다. 내림차순은 비교 함수 자체를 뒤집어서 만든다.
