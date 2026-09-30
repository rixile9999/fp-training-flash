---
id: higher-order-modularity
title: 고차 함수와 모듈성
level: advanced
relatedSkills: [function-decomposition]
furtherReading:
  - text: 'John Hughes, "Why Functional Programming Matters", The Computer Journal 32(2), 1989'
    verified: false
  - text: 'David L. Parnas, "On the criteria to be used in decomposing systems into modules", Communications of the ACM 15(12), 1972'
    verified: false
---
프로그램을 잘 나누는 능력은 나눈 조각을 다시 **붙이는 방법**이 얼마나 강력한지에 달려 있다. Hughes는 함수형 언어가 주는 두 가지 강력한 접착제로 고차 함수와 지연 평가를 꼽았다. Gleam은 즉시 평가 언어라 두 번째 접착제는 기본으로 주어지지 않지만, 첫 번째는 그대로 쓸 수 있다.

고차 함수는 함수를 인자로 받거나 함수를 돌려주는 함수다. 핵심은 **제어 구조와 결정의 분리**다. `list.map`, `list.filter`, `list.fold`는 "목록을 어떻게 훑는가"를 한 번만 구현하고, "각 항목에서 무엇을 결정하는가"는 호출하는 쪽이 함수로 넘긴다. 순회 코드는 한 번 검증되면 계속 재사용되고, 새로 쓰는 코드는 비즈니스 규칙 하나뿐이다.

함수를 돌려주는 쪽도 같은 효과를 낸다. 설정값을 받아 규칙 함수를 만들면, 규칙을 데이터처럼 목록에 담고 조합할 수 있다.

```gleam
import gleam/int
import gleam/list

pub type Rule =
  fn(Int) -> Int

pub fn percent_off(percent: Int) -> Rule {
  fn(amount) { amount - amount * percent / 100 }
}

pub fn flat_off(value: Int) -> Rule {
  fn(amount) { int.max(0, amount - value) }
}

pub fn apply_all(amount: Int, rules: List(Rule)) -> Int {
  list.fold(rules, amount, fn(acc, rule) { rule(acc) })
}
```

`apply_all(10_000, [percent_off(10), flat_off(1000)])`은 8000이다. `percent_off`가 돌려주는 함수는 `percent` 값을 기억하는 클로저다. 새 할인 방식을 추가해도 `apply_all`은 바뀌지 않는다. 적용 순서를 바꾸는 일도 목록의 순서만 바꾸면 된다. 규칙마다 따로 테스트할 수 있고, `apply_all`은 "순서대로 적용한다"는 한 가지 성질만 테스트하면 된다.

## 모듈성의 기준

Parnas는 모듈을 나누는 기준으로 "바뀔 가능성이 있는 결정을 한 곳에 숨기라"고 했다. 고차 함수는 이 원칙을 함수 단위에서 실현한다. 자주 바뀌는 것(할인 규칙, 정렬 기준, 필터 조건)은 인자로 넘기고, 잘 바뀌지 않는 것(순회, 누적, 순서 유지)은 고차 함수 안에 둔다. `list.sort(xs, by: compare)`가 정렬 알고리즘과 비교 기준을 분리하는 것도 같은 구조다.

## 언제 추상화하지 않는가

두 곳 이상의 코드가 **한 가지 결정만 다르고** 나머지가 같을 때 그 결정을 함수 인자로 뽑는다. 쓰이는 곳이 하나뿐인데 미리 함수 인자를 늘리면, 시그니처만 복잡해지고 읽는 사람이 실제로 넘어오는 함수를 찾아다녀야 한다. 흔한 실수는 반대 방향이다. 거의 같은 순회 코드를 조건만 바꿔 여러 번 복사하는 것이다. 한 곳을 고칠 때 다른 곳을 잊기 쉽다.

## 이 개념이 쓰이는 곳

- 가격, 할인, 검증 규칙처럼 자주 추가되는 정책을 함수 목록으로 표현할 때.
- 정렬 기준, 필터 조건, 집계 방식을 호출하는 쪽에서 정하게 할 때.
- 반복되는 재귀 코드를 `list.map`, `list.fold` 같은 기존 고차 함수로 바꾸는 리팩터링에서.
