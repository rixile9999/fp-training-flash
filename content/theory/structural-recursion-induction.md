---
id: structural-recursion-induction
title: 구조적 재귀와 귀납법
level: basic
relatedSkills: [data-transformation, recursive-algorithms]
furtherReading:
  - text: 'R. M. Burstall, "Proving properties of programs by structural induction", The Computer Journal 12(1), 1969'
    verified: false
  - text: 'Matthias Felleisen, Robert Bruce Findler, Matthew Flatt, Shriram Krishnamurthi, "How to Design Programs", MIT Press, 2001 (2nd ed. 2018)'
    verified: false
---
재귀 함수의 모양은 데이터 타입의 정의에서 나온다. Gleam의 목록은 빈 목록 `[]`이거나, 항목 하나와 나머지 목록 `[x, ..rest]`다. 그래서 목록을 처리하는 함수는 이 두 경우에 하나씩 분기를 두고, 재귀 호출은 **더 작은 부분**인 `rest`에만 한다. 이것이 구조적 재귀다.

```gleam
pub fn total(xs: List(Int)) -> Int {
  case xs {
    [] -> 0
    [x, ..rest] -> x + total(rest)
  }
}
```

이 모양이 주는 보장은 두 가지다.

- **종료**: 호출할 때마다 목록이 한 칸씩 짧아지고, 목록은 유한하므로 결국 `[]` 분기에 도달한다.
- **정확성**: 수학적 귀납법과 같은 구조로 따질 수 있다. `[]`일 때 답이 맞는지 확인한다(기저 단계). 그다음 `total(rest)`가 `rest`의 합을 정확히 돌려준다고 **가정**하고, 그러면 `x + total(rest)`가 전체의 합인지 확인한다(귀납 단계). 두 단계가 맞으면 모든 목록에서 맞다.

재귀 함수를 쓸 때 호출 과정을 끝까지 머릿속으로 펼칠 필요가 없는 이유가 이것이다. "나머지에 대한 답이 이미 있다면 지금 칸에서 무엇을 하면 되는가?"만 답하면 된다.

타입이 가지를 여러 개 가지면 재귀 호출도 여러 번 한다. 트리는 왼쪽과 오른쪽 부분 트리가 모두 더 작은 구조이므로 둘 다 재귀 호출한다.

```gleam
pub type Tree {
  Leaf
  Node(left: Tree, value: Int, right: Tree)
}

pub fn size(tree: Tree) -> Int {
  case tree {
    Leaf -> 0
    Node(left, _, right) -> size(left) + 1 + size(right)
  }
}
```

흔한 실수는 세 가지다. 첫째, 기저 단계의 값을 틀리게 정하는 것이다(빈 목록의 합을 1로 두는 식). `[]` 분기를 아예 빠뜨리면 컴파일러가 잡아 주지만, 값이 틀린 것은 잡지 못한다. 둘째, 더 작아지지 않는 값으로 재귀하는 것이다. 같은 목록으로 다시 호출하거나 정수가 기저 값을 건너뛰어 계속 작아지면 끝나지 않는다. 셋째, `[x]` 같은 특수한 경우를 불필요하게 따로 처리해 분기 사이의 규칙이 어긋나는 것이다. 정수 `n`으로 재귀할 때도 `n - 1`이 "더 작은 자연수"여야 하므로 음수 입력을 먼저 막아야 한다.

위의 `total`은 재귀 호출 뒤에 덧셈이 남아 있어 꼬리 재귀가 아니다. BEAM에서는 스택이 고정 크기로 넘치지 않고 필요한 만큼 자라지만, 입력 길이에 비례하는 메모리를 쓴다. 긴 입력은 누적자를 쓰는 꼬리 재귀로 바꿀 수 있다(누적자와 꼬리 재귀 참고).

## 이 개념이 쓰이는 곳

- 목록, 트리, 직접 정의한 재귀 타입을 처리하는 함수를 설계할 때 생성자마다 분기를 하나씩 둔다.
- 재귀 함수가 맞는지 확인할 때 기저 단계와 귀납 단계를 나눠 따진다.
- 구조적 재귀의 공통 모양을 추상화한 것이 fold다(fold의 보편성 참고).
