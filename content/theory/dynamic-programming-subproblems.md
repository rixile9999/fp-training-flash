---
id: dynamic-programming-subproblems
title: 동적 계획법, 부분 문제를 한 번만 풀기
level: basic
relatedSkills: [dynamic-programming]
furtherReading:
  - text: 'Richard Bellman, "Dynamic Programming", Princeton University Press, 1957'
    verified: false
  - text: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein, "Introduction to Algorithms", 3rd ed., MIT Press, 2009'
    verified: false
---
문제를 재귀로 나눴는데 같은 부분 문제가 여러 경로에서 반복해서 나온다면, 한 번 푼 답을 저장해 두고 다시 쓴다. 이것이 동적 계획법이다. 두 조건이 맞을 때 쓴다.

- **최적 부분 구조**: 큰 문제의 답을 작은 문제의 답으로 만들 수 있다.
- **겹치는 부분 문제**: 같은 작은 문제가 여러 번 필요하다.

## 겹침이 비용을 폭발시킨다

피보나치 수 `fib(n) = fib(n - 1) + fib(n - 2)`를 그대로 재귀로 옮기면 `fib(n - 2)`는 두 갈래에서 모두 계산되고, 그 아래도 마찬가지다. 호출 수는 n에 대해 지수적으로(대략 1.6ⁿ) 늘어난다. 그런데 서로 다른 부분 문제는 `fib(0)`부터 `fib(n)`까지 n + 1개뿐이다. 각각을 한 번만 풀면 O(n)이다.

## 설계 순서

1. **상태**: 부분 문제를 무엇으로 구별하는가. 목록의 위치, 남은 금액, 두 문자열 앞부분의 길이 쌍 같은 값이다. 답에 영향을 주는 정보가 상태에서 빠지면 서로 다른 문제를 같은 칸에 저장하게 되어 답이 틀린다.
2. **점화식**: 한 상태의 답을 더 작은 상태들의 답으로 적는다.
3. **기저 사례**: 더 줄일 수 없는 상태의 답. "0원을 만드는 방법", "빈 문자열까지의 거리"처럼 대개 크기가 0인 경우다.
4. **계산 순서**: 어떤 상태를 계산할 때 필요한 작은 상태가 이미 준비되어 있어야 한다.
5. **답의 위치**: 원래 문제가 어느 상태인가.

전체 비용은 대략 (상태의 수) × (상태 하나를 계산하는 비용)이다. 표를 `Dict`로 두면 조회마다 O(log n) 정도가 더 붙는다.

## 위에서 아래로: 메모를 함께 넘긴다

불변 언어에는 전역 캐시가 없으므로 메모 표를 인자로 받고, 갱신한 표를 결과와 함께 돌려준다.

```gleam
import gleam/dict.{type Dict}

pub fn fib_memo(n: Int, memo: Dict(Int, Int)) -> #(Int, Dict(Int, Int)) {
  case n <= 1 {
    True -> #(n, memo)
    False ->
      case dict.get(memo, n) {
        Ok(value) -> #(value, memo)
        Error(Nil) -> {
          let #(a, memo) = fib_memo(n - 1, memo)
          let #(b, memo) = fib_memo(n - 2, memo)
          let value = a + b
          #(value, dict.insert(memo, n, value))
        }
      }
  }
}
```

핵심은 두 번째 호출에 첫 번째 호출이 **돌려준** 표를 넘기는 것이다. 처음 받은 표를 두 호출에 똑같이 넘기면 첫 번째 호출이 채운 칸이 버려져서, 코드에 메모가 있는데도 여전히 지수 시간이 걸린다. 위처럼 같은 이름 `memo`로 다시 묶으면 옛 표를 실수로 쓸 수 없다.

## 아래에서 위로: 필요한 만큼만 들고 다닌다

작은 상태부터 차례로 채우면 계산 순서가 저절로 맞는다. 피보나치는 바로 앞 두 값만 필요하므로 표 전체 대신 누적자 두 개면 된다.

```gleam
pub fn fib(n: Int) -> Int {
  case n <= 0 {
    True -> 0
    False -> fib_loop(1, n, 0, 1)
  }
}

// previous = fib(i - 1), current = fib(i)
fn fib_loop(i: Int, n: Int, previous: Int, current: Int) -> Int {
  case i == n {
    True -> current
    False -> fib_loop(i + 1, n, current, previous + current)
  }
}
```

상태가 2차원일 때도 같은 생각을 쓴다. 한 행이 바로 윗행에만 의존한다면 표 전체 대신 이전 행 하나를 목록으로 들고 다니며 다음 행을 만든다. 목록의 i번째 원소 접근은 O(i)이므로, 행을 만들 때는 인덱스로 찾지 말고 이전 행과 나란히 훑는다.

## 탐욕으로는 안 되는 경우

"매번 가장 좋아 보이는 선택"이 전체 최적을 보장하지 않을 때 동적 계획법이 필요하다. 동전 1, 3, 4원으로 6원을 만들 때 큰 동전부터 고르면 4 + 1 + 1로 3개지만, 최적은 3 + 3으로 2개다. 모든 선택지를 부분 문제의 답으로 비교해야 한다.

## 이 개념이 쓰이는 곳

- 최소 개수, 최대 가치, 경우의 수, 두 문자열 사이의 거리를 묻는 문제.
- 백트래킹 탐색에서 같은 상태가 반복해서 나타날 때. 상태를 키로 메모를 붙이면 동적 계획법이 된다.
