---
id: immutability-structural-sharing
title: 불변 값과 구조 공유
level: basic
relatedSkills: [data-transformation, functional-data-structures]
furtherReading:
  - text: 'Chris Okasaki, "Purely Functional Data Structures", Cambridge University Press, 1998'
    verified: false
---
Gleam의 값은 한 번 만들어지면 바뀌지 않는다. 목록에 항목을 넣거나 레코드의 필드를 고치는 연산은 원래 값을 수정하지 않고 **새 값**을 돌려준다. 원래 값을 가진 쪽은 계속 같은 값을 본다.

매번 새 값을 만들면 느릴 것 같지만, 바뀌지 않은 부분은 복사하지 않고 **공유**하기 때문에 대부분 싸다. 목록 앞에 항목을 붙이는 `[x, ..xs]`는 새 칸 하나만 만들고 `xs` 전체를 그대로 가리킨다.

```gleam
pub fn shared_tails() -> #(List(Int), List(Int), List(Int)) {
  let base = [2, 3]
  let a = [1, ..base]
  let b = [9, ..base]
  #(base, a, b)
}
```

`a`와 `b`는 같은 `base`를 꼬리로 공유한다. 누구도 `base`를 바꿀 수 없으므로 공유해도 안전하다. 가변 목록이었다면 한쪽의 수정이 다른 쪽에 새어 나가므로 방어적으로 복사해야 했을 것이다.

레코드 갱신도 같다. `Order(..order, amount: 0)`은 필드 몇 개짜리 새 레코드 하나를 만들고, 바뀌지 않은 필드의 값(예: 긴 `items` 목록)은 복사하지 않고 같은 값을 가리킨다.

```gleam
pub type Order {
  Order(id: Int, items: List(String), amount: Int)
}

pub fn clear_amount(order: Order) -> Order {
  Order(..order, amount: 0)
}
```

## 비용이 드는 경우

공유는 "바뀌지 않은 부분"이 새 값의 **끝쪽**에 있을 때 성립한다. 목록 끝에 붙이는 `list.append(xs, [x])`는 `xs`의 모든 칸을 새로 만들어야 하므로 O(n)이다. 반복문처럼 끝에 하나씩 붙이면 전체가 O(n²)이 된다. 그래서 함수형 코드는 앞에 붙여 모은 뒤 마지막에 `list.reverse`를 한 번 하는 방식을 쓴다.

## 불변성이 주는 것

- **추론이 지역적이다**: 함수에 값을 넘겨도 그 함수가 내 값을 바꿀 수 없다. 테스트에서 호출 뒤에 원래 입력이 그대로인지 걱정할 필요가 없다.
- **이전 버전이 남는다**: 갱신 전 값과 갱신 후 값을 동시에 들고 있을 수 있어 비교, 되돌리기, 이력 보관이 쉽다.
- **공유가 안전하다**: 여러 곳에서 같은 값을 들고 있어도 누구도 그 값을 바꿀 수 없으므로 방어적 복사나 잠금이 필요 없다.

흔한 실수는 "갱신했는데 반영이 안 된다"는 착각이다. `clear_amount(order)`를 호출하고 반환값을 버리면 아무 일도 일어나지 않는다. 새 값은 반드시 변수에 묶거나 다음 단계로 넘겨야 한다.

## 이 개념이 쓰이는 곳

- 레코드 갱신 문법으로 일부 필드만 바꾼 새 값을 만들 때.
- 목록을 쌓을 때 앞에 붙이고 마지막에 뒤집는 패턴을 고를 때.
- 영속 자료구조를 설계할 때, 갱신된 부분만 새로 만들고 나머지를 공유하는 것이 핵심 아이디어다.
