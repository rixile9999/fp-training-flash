import gleam/int

pub type Item {
  Item(value: Int, weight: Int)
}

// 넣는다/안 넣는다를 그대로 재귀로 옮겼다. 답은 맞지만 표가 없어서
// 물건 n개에 대해 최대 2^n가지 경우를 모두 따라간다.
pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int {
  case items {
    [] -> 0
    [item, ..rest] if item.weight > maximum_weight ->
      maximum_value(rest, maximum_weight)
    [item, ..rest] ->
      int.max(
        maximum_value(rest, maximum_weight),
        item.value + maximum_value(rest, maximum_weight - item.weight),
      )
  }
}
