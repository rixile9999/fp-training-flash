pub type Cargo {
  Cargo(id: String, value: Int, weight: Int)
}

pub type Selection {
  Selection(total_value: Int, ids: List(String))
}

// 싣는다/안 싣는다를 그대로 재귀로 옮겼다. 답은 맞지만 표가 없어서
// 화물 n개에 대해 최대 2^n가지 경우를 모두 따라간다.
pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection {
  case cargo {
    [] -> Selection(0, [])
    [item, ..rest] if item.weight > max_weight ->
      best_selection(rest, max_weight)
    [item, ..rest] -> {
      let skip = best_selection(rest, max_weight)
      let taken = best_selection(rest, max_weight - item.weight)
      case taken.total_value + item.value > skip.total_value {
        True ->
          Selection(taken.total_value + item.value, [item.id, ..taken.ids])
        False -> skip
      }
    }
  }
}
