---
id: search-space-backtracking
title: 탐색 공간과 백트래킹
level: basic
relatedSkills: [search-and-graphs]
furtherReading:
  - text: 'Philip Wadler, "How to Replace Failure by a List of Successes", FPCA 1985'
    verified: false
  - text: 'Richard Bird, "Pearls of Functional Algorithm Design", Cambridge University Press, 2010'
    verified: false
---
조건을 만족하는 선택의 조합을 찾는 문제는 **탐색 공간**이라는 트리로 볼 수 있다. 뿌리는 아무것도 고르지 않은 상태, 간선 하나는 선택 하나, 잎은 선택을 모두 마친 후보다. 이 트리는 빠르게 커진다. 상품 n개를 넣을지 말지 고르면 잎이 2ⁿ개, n개를 한 줄로 세우면 n!개다.

**백트래킹**은 이 트리를 깊이 우선으로 내려가면서, 부분 선택이 이미 조건을 어기면 그 아래 가지 전체를 버리는(가지치기) 탐색이다.

## 불변 상태에서는 되돌리기가 공짜다

명령형 코드는 보드를 바꾸고, 재귀하고, 돌아와서 바꾼 것을 되돌린다. 되돌리기를 빠뜨리면 다음 가지가 오염된다. 불변 값을 쓰면 새 상태를 만들어 재귀 호출에 넘기기만 한다. 호출한 쪽의 상태는 그대로이므로 호출이 끝나면 원래 상태에서 다음 선택을 시도하면 된다. 되돌리는 코드가 없으니 되돌리기 버그도 없다.

## 결과를 무엇으로 돌려줄까

같은 탐색이라도 질문에 따라 가지의 결과를 합치는 방법이 다르다.

- **해의 개수**: `Int`를 돌려주고 가지마다 나온 수를 더한다.
- **모든 해**: `List`를 돌려주고 가지의 결과를 이어 붙인다. 실패는 빈 목록이다.
- **해 하나**: `Result`를 돌려주고 앞 가지가 `Ok`이면 멈추고, `Error`이면 다음 가지를 시도한다.

아래 두 함수는 상품 가격 목록에서 합이 정확히 `budget`이 되는 조합을 다룬다. 가격은 모두 양수라고 가정한다. 상품마다 "넣는다"와 "넣지 않는다" 두 갈래로 내려간다.

```gleam
pub fn count_combinations(prices: List(Int), budget: Int) -> Int {
  case budget, prices {
    0, _ -> 1
    _, _ if budget < 0 -> 0
    _, [] -> 0
    _, [price, ..rest] ->
      count_combinations(rest, budget - price)
      + count_combinations(rest, budget)
  }
}

pub fn find_combination(
  prices: List(Int),
  budget: Int,
) -> Result(List(Int), Nil) {
  case budget, prices {
    0, _ -> Ok([])
    _, _ if budget < 0 -> Error(Nil)
    _, [] -> Error(Nil)
    _, [price, ..rest] ->
      case find_combination(rest, budget - price) {
        Ok(chosen) -> Ok([price, ..chosen])
        Error(Nil) -> find_combination(rest, budget)
      }
  }
}
```

예를 들어 `count_combinations([2, 3, 5], 5)`는 `[2, 3]`과 `[5]` 두 가지이므로 2다. 기저 사례의 순서가 의미를 가진다. 남은 예산이 0이면 남은 상품과 관계없이 조합 하나가 완성된 것이고, 예산이 음수가 되면 그 가지는 더 볼 필요가 없다.

## 가지치기는 되도록 일찍

조건 검사를 잎에서 한 번에 하면 버릴 후보까지 끝까지 만들어 본다. 선택을 하나 추가할 때마다 검사하면 틀린 부분 선택 아래의 가지를 통째로 건너뛴다. 최악의 복잡도는 그대로여도 실제로 방문하는 노드 수는 크게 줄어든다. 위 예에서는 예산이 음수가 되는 순간 그 아래를 보지 않는다.

같은 상태(여기서는 "남은 상품의 위치와 남은 예산")가 여러 가지에서 반복된다면 메모를 붙여 동적 계획법으로 바꿀 수 있다.

## 최단 경로는 너비 우선으로

깊이 우선 탐색은 어떤 경로든 찾아내지만 그것이 가장 짧다는 보장은 없다. 간선 비용이 모두 같은 그래프나 격자에서 최단 거리를 구하려면 **너비 우선 탐색**을 쓴다. 출발점에서 거리 1인 칸을 모두 본 뒤 거리 2인 칸을 보는 식으로 퍼져 나가므로, 목적지에 처음 닿은 순간의 거리가 최단 거리다.

- **큐**가 필요하다. 목록 하나에 뒤로 붙이면 넣을 때마다 O(n)이므로, 목록 두 개로 만든 큐를 쓰거나 "현재 거리의 칸 목록"에서 "다음 거리의 칸 목록"을 한꺼번에 만든다.
- **방문 집합**이 필요하다. 없으면 같은 칸을 여러 번 넣고, 순환이 있는 그래프에서는 끝나지 않는다. 칸을 큐에 **넣을 때** 방문 표시를 해야 같은 칸이 큐에 여러 번 들어가지 않는다.

## 이 개념이 쓰이는 곳

- 조각을 이어 붙이거나 말을 배치하는 문제처럼 선택을 차례로 쌓는 조합 탐색.
- 미로와 격자의 최단 거리(너비 우선 탐색).
- 반복되는 상태를 메모해 동적 계획법으로 바꾸는 출발점.
