택배 트럭 배차 담당자는 가치 합만이 아니라 **어떤 화물을 실을지**도 알아야 합니다. 화물 목록과 무게 한도를 받아, 가치 합이 가장 큰 조합의 가치 합과 화물 id 목록을 구하세요.

```gleam
pub type Cargo {
  Cargo(id: String, value: Int, weight: Int)
}

pub type Selection {
  Selection(total_value: Int, ids: List(String))
}

pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection
```

- 고른 화물의 무게 합은 `max_weight` 이하다. 각 화물은 최대 한 번 싣는다. 가치와 무게는 양의 정수다.
- `ids`는 고른 화물의 id를 **입력 목록의 순서대로** 담는다. 아무것도 못 실으면 `Selection(0, [])`이다.
- 테스트 입력에서 가치 합이 가장 큰 조합은 하나뿐이다.
- 화물이 40개여도 시간 제한 안에 끝나야 한다.

```gleam
best_selection(
  [Cargo("a", 60, 5), Cargo("b", 50, 4), Cargo("c", 70, 6), Cargo("d", 30, 3)],
  10,
)
// -> Selection(total_value: 120, ids: ["b", "c"])
```
