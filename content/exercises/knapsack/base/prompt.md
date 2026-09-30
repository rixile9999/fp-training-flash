산악 가이드가 베이스캠프까지 짐을 나릅니다. 물건마다 가치와 무게가 있고, 배낭은 정해진 무게까지만 들 수 있습니다. 가져갈 물건의 가치 합이 가장 크도록 골랐을 때 그 **가치 합**을 구하세요.

```gleam
pub type Item {
  Item(value: Int, weight: Int)
}

pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int
```

- 고른 물건의 무게 합은 `maximum_weight` 이하여야 한다.
- 물건은 하나씩만 있다. 각 물건은 넣거나 안 넣거나 둘 중 하나다.
- 모든 가치와 무게는 양의 정수다. 아무것도 넣을 수 없으면 0이다.
- 물건이 50개여도 시간 제한 안에 끝나야 한다.

```gleam
maximum_value(
  [Item(value: 10, weight: 5), Item(value: 40, weight: 4),
   Item(value: 30, weight: 6), Item(value: 50, weight: 4)],
  10,
)
// -> 90 (둘째와 넷째 물건, 무게 8)
```
