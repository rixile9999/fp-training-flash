---
id: persistent-data-structures
title: 영속 자료구조와 경로 복사
level: advanced
relatedSkills: [functional-data-structures]
furtherReading:
  - text: 'Chris Okasaki, "Purely Functional Data Structures", Cambridge University Press, 1998'
    verified: false
  - text: 'James R. Driscoll, Neil Sarnak, Daniel D. Sleator, Robert E. Tarjan, "Making Data Structures Persistent", Journal of Computer and System Sciences 38(1), 1989'
    verified: false
  - text: 'Gérard Huet, "The Zipper", Journal of Functional Programming 7(5), 1997'
    verified: false
---
갱신한 뒤에도 이전 버전이 그대로 남아 계속 쓸 수 있는 자료구조를 **영속**(persistent) 자료구조라고 한다. 갱신이 이전 버전을 없애 버리면 **일시적**(ephemeral) 자료구조다.

Gleam의 값은 모두 불변이므로 Gleam으로 만든 자료구조는 저절로 영속적이다. 그래서 설계에서 물을 것은 "영속성을 어떻게 얻는가"가 아니라 "갱신할 때마다 얼마나 새로 만드는가"다.

## 경로 복사

갱신은 바뀌는 곳까지 가는 **경로 위의 노드만** 새로 만들고, 나머지는 이전 버전과 공유한다. 목록의 i번째 원소를 바꾸는 함수로 보면 이렇다.

```gleam
pub fn set_at(items: List(a), index: Int, value: a) -> List(a) {
  case items, index {
    [], _ -> []
    [_, ..rest], 0 -> [value, ..rest]
    [first, ..rest], _ -> [first, ..set_at(rest, index - 1, value)]
  }
}
```

앞의 `index + 1`칸은 새로 만들고, 바뀐 칸 뒤의 `rest`는 그대로 공유한다. 그래서 맨 앞을 바꾸면 O(1), 맨 끝을 바꾸면 O(n)이다. 원래 목록은 조금도 바뀌지 않는다.

트리에서는 경로가 뿌리에서 바뀌는 노드까지다. 아래는 이진 탐색 트리에 5를 넣는 모습이다. 표시(')가 붙은 노드만 새로 만들고, `10`과 `1`은 두 버전이 공유한다.

```text
  이전 버전          새 버전
      8                 8'
     / \               / \
    3   10            3'  10
   / \               / \
  1   6             1   6'
                       /
                      5
```

새로 만드는 노드 수는 뿌리에서 바뀌는 곳까지의 경로 길이이므로 많아야 트리의 높이 정도다. 균형 잡힌 트리라면 갱신 한 번이 시간과 메모리 모두 O(log n)이고, 한쪽으로 치우친 트리라면 O(n)이다. 그래서 영속 자료구조 설계의 핵심은 **높이를 낮게 지키는 불변식**이다.

## 불변식이 경로를 짧게 지킨다: 레프티스트 힙

레프티스트 힙은 가장 작은 값을 빨리 꺼내는 우선순위 큐다. 두 불변식을 지킨다.

- **힙 순서**: 부모의 값은 자식의 값보다 크지 않다. 그래서 가장 작은 값은 뿌리에 있다.
- **왼쪽 치우침**: 노드마다 오른쪽 척추(오른쪽 자식만 따라 끝까지 내려간 경로)의 길이를 **랭크**라 할 때, 왼쪽 자식의 랭크가 오른쪽 자식의 랭크보다 작지 않다.

두 번째 불변식 때문에 오른쪽 척추는 빈 자리까지 가는 가장 짧은 경로가 되고, 랭크가 r인 힙에는 노드가 적어도 2ʳ - 1개 있다. 따라서 노드가 n개인 힙의 오른쪽 척추 길이는 log₂(n + 1) 이하다. 두 힙을 합치는 연산은 두 힙의 오른쪽 척추만 따라 내려가므로 O(log n)이고, 그 경로만 새로 만든다. 삽입은 노드 하나짜리 힙과 합치기, 최솟값 꺼내기는 뿌리의 두 자식을 합치기로 표현된다. 합친 뒤 랭크를 비교해 두 자식을 바꿔 두는 단계를 빠뜨리면 불변식이 깨지고 척추가 길어진다.

## 지퍼: 한곳을 반복해서 고칠 때

같은 위치 근처를 여러 번 고치면 뿌리부터 경로를 매번 복사하는 비용이 반복된다. **지퍼**는 현재 위치(초점)와 "되돌아가는 길"(맥락)을 함께 저장해, 초점을 옮기거나 초점의 값을 바꾸는 일을 O(1)로 만든다. 전체 구조는 위로 올라가면서 다시 조립한다. 목록 지퍼로 보면 이렇다. 앞쪽 원소는 가까운 것이 먼저 오도록 뒤집어 저장한다.

```gleam
pub type ListZipper(a) {
  ListZipper(before: List(a), focus: a, after: List(a))
}

pub fn next(zipper: ListZipper(a)) -> Result(ListZipper(a), Nil) {
  case zipper.after {
    [] -> Error(Nil)
    [first, ..rest] ->
      Ok(ListZipper([zipper.focus, ..zipper.before], first, rest))
  }
}

pub fn set_focus(zipper: ListZipper(a), value: a) -> ListZipper(a) {
  ListZipper(..zipper, focus: value)
}
```

트리 지퍼는 맥락에 "어느 쪽 자식으로 내려왔는지와 그때 두고 온 형제 부분 트리"를 쌓는다는 점만 다르다.

## 영속성이 주는 것과 주의할 점

- **이력과 되돌리기**: 옛 버전을 들고 있기만 하면 된다. 복사가 필요 없다.
- **백트래킹**: 재귀 호출에 새 버전을 넘겨도 호출한 쪽의 버전은 그대로다.
- **메모리**: 두 버전은 대부분을 공유하므로 추가 메모리는 바뀐 경로만큼이다.
- **주의**: 상각 비용 보장은 옛 버전을 되풀이해 쓰면 깨질 수 있다. 연산마다 최악 비용이 보장되는 구조(레프티스트 힙의 O(log n) 합치기 등)는 이 문제가 없다.

## 이 개념이 쓰이는 곳

- 우선순위 큐(레프티스트 힙), 트리 편집(지퍼), 편집 이력과 되돌리기.
- `Dict`와 `Set`도 영속 자료구조다. `insert`는 새 버전을 돌려주고 이전 버전은 그대로 쓸 수 있다.
