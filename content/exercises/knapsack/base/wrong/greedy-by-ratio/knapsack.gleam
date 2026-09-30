import gleam/int
import gleam/list

pub type Item {
  Item(value: Int, weight: Int)
}

// 무게당 가치가 큰 물건부터 들어가는 대로 넣는다. 빠르지만 최적이 아니다.
pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int {
  items
  |> list.sort(fn(a, b) {
    // 무게당 가치(value / weight)의 내림차순
    int.compare(b.value * a.weight, a.value * b.weight)
  })
  |> list.fold(#(0, maximum_weight), fn(state, item) {
    let #(total, room) = state
    case item.weight <= room {
      True -> #(total + item.value, room - item.weight)
      False -> state
    }
  })
  |> fn(state) { state.0 }
}
