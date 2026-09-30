---
id: fold-universality
title: fold의 보편성, 목록 재귀의 공통 뼈대
level: advanced
relatedSkills: [data-transformation, recursive-algorithms]
furtherReading:
  - text: 'Graham Hutton, "A tutorial on the universality and expressiveness of fold", Journal of Functional Programming 9(4), 1999'
    verified: false
  - text: 'Erik Meijer, Maarten Fokkinga, Ross Paterson, "Functional Programming with Bananas, Lenses, Envelopes and Barbed Wire", FPCA 1991'
    verified: false
---
목록을 끝까지 훑는 재귀 함수는 거의 모두 같은 모양이다. 빈 목록일 때 돌려줄 값 `v`가 있고, `[x, ..rest]`일 때는 `x`와 `rest`를 처리한 결과를 함수 `f`로 합친다.

```text
g([])          = v
g([x, ..rest]) = f(g(rest), x)
```

`list.fold_right(xs, v, f)`는 정확히 이 모양을 한 번만 구현해 둔 함수다. **보편성**(universal property)은 이 관계가 양방향이라는 뜻이다. 어떤 함수 `g`가 위 두 식을 만족하면 `g`는 반드시 `fold_right(_, v, f)`와 같다. 따라서 합계, 길이, `map`, `filter`처럼 "빈 경우 + 한 칸씩 합치기"로 정의되는 함수는 모두 fold로 쓸 수 있다. 또 두 함수가 같은 `v`와 `f`로 위 두 식을 만족함을 보이면, 귀납법을 새로 쓰지 않아도 두 함수가 같다고 결론 낼 수 있다. 귀납법은 보편성을 증명할 때 이미 한 번 썼기 때문이다.

```gleam
import gleam/list

pub fn map_via_fold(xs: List(a), f: fn(a) -> b) -> List(b) {
  list.fold_right(xs, [], fn(acc, x) { [f(x), ..acc] })
}

pub fn filter_via_fold(xs: List(a), keep: fn(a) -> Bool) -> List(a) {
  list.fold_right(xs, [], fn(acc, x) {
    case keep(x) {
      True -> [x, ..acc]
      False -> acc
    }
  })
}
```

fold로 생각하면 문제를 두 질문으로 줄일 수 있다. "빈 입력의 답은 무엇인가?"와 "나머지의 답이 있을 때 항목 하나를 어떻게 더하는가?"이다. 이 두 답이 정해지면 순회 코드는 직접 쓸 필요가 없다. 누적값을 튜플로 만들면 합계와 개수처럼 여러 결과를 한 번의 순회로 계산할 수도 있다.

## 왼쪽 fold와 오른쪽 fold

Gleam의 `list.fold`는 왼쪽부터 누적하는 꼬리 재귀 함수이고, `list.fold_right`는 오른쪽부터 합치며 꼬리 재귀가 아니다. 두 함수 모두 콜백이 `fn(acc, x)` 순서로 인자를 받으므로 달라지는 것은 항목을 방문하는 순서뿐이다. 교환법칙과 결합법칙이 함께 성립하는 연산(`+`, `int.max`)은 방향과 상관없이 결과가 같다. 문자열 이어 붙이기나 목록 만들기처럼 순서가 의미 있는 연산은 방향이 결과를 바꾼다.

```gleam
import gleam/list

pub fn reverse_via_fold(xs: List(a)) -> List(a) {
  list.fold(xs, [], fn(acc, x) { [x, ..acc] })
}
```

`list.fold`로 `[x, ..acc]`를 쌓으면 순서가 뒤집힌다. 흔한 실수는 이 사실을 잊고 결과를 그대로 돌려주는 것이다. 순서를 지켜야 하면 마지막에 `list.reverse`를 한 번 호출하거나 `fold_right`를 쓴다. BEAM에서는 몸통 재귀의 스택도 필요한 만큼 자라므로 `fold_right`가 긴 목록에서 넘치지 않는다. 목록을 만드는 경우 두 방식의 속도와 메모리 사용량은 대체로 비슷하므로(누적자와 꼬리 재귀 참고) 읽기 쉬운 쪽을 고르면 된다.

## 이 개념이 쓰이는 곳

- 이벤트 목록을 차례로 적용해 최종 상태를 만드는 계산은 초기 상태를 `v`로, 이벤트 적용을 `f`로 둔 fold다.
- 합계, 개수, 최댓값을 한 번에 구할 때 튜플이나 레코드를 누적값으로 쓴다.
- 직접 쓴 재귀 함수가 fold 모양인지 알아보면 `list.fold`나 `list.map`으로 바꿔 더 짧고 안전하게 만들 수 있다.
