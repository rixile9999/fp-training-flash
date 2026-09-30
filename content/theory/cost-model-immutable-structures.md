---
id: cost-model-immutable-structures
title: 불변 자료구조의 비용 모델
level: basic
relatedSkills: [recursive-algorithms, dynamic-programming, search-and-graphs, functional-data-structures]
furtherReading:
  - text: 'Chris Okasaki, "Purely Functional Data Structures", Cambridge University Press, 1998'
    verified: false
  - text: 'Erlang System Documentation, "Efficiency Guide"'
    verified: false
---
불변 값은 바꿀 수 없으므로 "수정"은 새 값을 만드는 일이다. 새 값은 달라진 부분만 새로 만들고 나머지는 원래 값과 공유한다. 그래서 함수형 코드의 비용은 대부분 두 질문으로 정해진다.

- 이 연산은 구조를 **어디까지 따라가야** 하는가?
- 이 연산은 **몇 칸을 새로 만들어야** 하는가?

## 목록은 단일 연결 리스트다

Gleam의 `List(a)`는 "첫 원소 + 나머지 목록을 가리키는 칸"의 사슬이다. 앞쪽은 싸고 뒤쪽은 비싸다.

| 연산 | 비용 | 이유 |
|---|---|---|
| `[x, ..xs]` 앞에 붙이기 | O(1) | 새 칸 하나가 기존 `xs`를 가리킨다 |
| `[first, ..rest]` 패턴 매칭 | O(1) | 첫 칸만 본다 |
| `list.length(xs)` | O(n) | 길이를 저장하지 않으므로 끝까지 센다 |
| `list.append(xs, ys)` | O(`xs`의 길이) | `xs`의 칸을 모두 복사하고 `ys`는 공유한다 |
| `list.reverse(xs)` | O(n) | 모든 칸을 새로 만든다 |
| `list.last(xs)`, i번째 원소 | O(n), O(i) | 앞에서부터 따라가야 한다 |
| `list.contains(xs, x)` | O(n) | 하나씩 비교한다 |

## Dict와 Set

`Dict`는 Erlang의 map 위에 만들어져 있다. 조회와 삽입은 키가 n개일 때 대략 O(log n)으로 생각하면 되고, 목록을 훑는 O(n)보다 훨씬 싸다. `dict.insert`는 원래 dict를 그대로 두고 대부분을 공유하는 새 dict를 돌려준다. `dict.size`는 상수 시간 O(1)이다. `gleam/set`의 `Set`은 내부가 `Dict`이므로 비용도 같다.

## 문자열

문자열은 Erlang에서 UTF-8 바이너리다. `string.length`는 사람이 보는 글자(그래핌)를 세야 하므로 O(n)이다. `string.to_graphemes`처럼 글자 목록을 만드는 함수도 전체를 훑는다. 반복문 안에서 같은 문자열의 길이를 매번 다시 재지 않는다.

## 흔한 함정

반복 안에서 O(n)짜리 연산을 n번 하면 O(n²)이 된다. 대부분의 성능 문제는 이 모양이다.

1. 비었는지 알려고 `list.length(xs) == 0`을 쓴다. 패턴 `[]`나 `list.is_empty`는 O(1)이다.
2. 반복 안에서 `list.append(acc, [x])`로 뒤에 붙인다. 앞에 붙이고 마지막에 한 번 뒤집는다.
3. 반복 안에서 `list.contains`나 i번째 원소 접근을 한다. 조회가 잦으면 `Set`이나 `Dict`로 바꾼다.
4. 목록 하나로 큐를 만들고 뒤에 넣는다. 넣을 때마다 O(n)이다. 목록 두 개로 만든 큐를 쓴다.
5. 같은 인자로 같은 재귀 호출을 여러 번 한다. 결과를 `let`으로 한 번 받아 재사용하고, 겹치는 부분 문제가 많으면 동적 계획법으로 바꾼다.

```gleam
import gleam/list
import gleam/set

// O(n * m): 주문마다 차단 목록 전체를 훑는다
pub fn blocked_orders_slow(
  order_ids: List(Int),
  blocked: List(Int),
) -> List(Int) {
  list.filter(order_ids, fn(id) { list.contains(blocked, id) })
}

// 차단 목록을 한 번 Set으로 바꾼 뒤 조회한다. 조회 한 번이 O(log m) 정도다
pub fn blocked_orders(order_ids: List(Int), blocked: List(Int)) -> List(Int) {
  let blocked_set = set.from_list(blocked)
  list.filter(order_ids, fn(id) { set.contains(blocked_set, id) })
}
```

## 비용을 어떻게 세는가

빅오 표기는 입력이 커질 때 작업량이 늘어나는 **모양**이다. n이 10배가 되면 O(n)은 10배, O(n log n)은 10배를 조금 넘고, O(n²)은 100배가 된다. 작은 입력에서는 차이가 보이지 않다가 입력이 커지면 급격히 벌어진다.

이 플랫폼의 성능 검사는 실행 시간 대신 BEAM이 세는 작업 단위(reductions, 함수 호출 등을 센 값)를 비교한다. 기계 상태에 흔들리지 않으므로 복잡도의 차이가 그대로 드러난다.

## 이 개념이 쓰이는 곳

- 알고리즘 문제의 성능 검사. 의도한 복잡도보다 한 단계 나쁜 풀이는 큰 입력에서 한도를 넘는다.
- 목록을 쌓을 때는 앞에 붙이고 뒤집기, 조회가 잦으면 `Dict`나 `Set`, 큐는 목록 두 개.
- 동적 계획법의 표를 `Dict`로 둘지, 이전 행만 목록으로 들고 다닐지 고를 때.
