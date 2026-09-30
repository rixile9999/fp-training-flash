import gleam/int
import gleam/list

pub type Cargo {
  Cargo(id: String, value: Int, weight: Int)
}

pub type Selection {
  Selection(total_value: Int, ids: List(String))
}

// 무게당 가치가 큰 화물부터 들어가는 대로 싣는다. 빠르지만 최적이 아니다.
pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection {
  let chosen =
    cargo
    |> list.sort(fn(a, b) {
      int.compare(b.value * a.weight, a.value * b.weight)
    })
    |> list.fold(#([], max_weight), fn(state, item) {
      let #(taken, room) = state
      case item.weight <= room {
        True -> #([item.id, ..taken], room - item.weight)
        False -> state
      }
    })
    |> fn(state) { state.0 }
  let picked = list.filter(cargo, fn(item) { list.contains(chosen, item.id) })
  Selection(
    total_value: list.fold(picked, 0, fn(sum, item) { sum + item.value }),
    ids: list.map(picked, fn(item) { item.id }),
  )
}
