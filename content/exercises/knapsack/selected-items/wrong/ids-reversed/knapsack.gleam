import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result

pub type Cargo {
  Cargo(id: String, value: Int, weight: Int)
}

pub type Selection {
  Selection(total_value: Int, ids: List(String))
}

// id를 앞에 붙여 모았는데 마지막에 뒤집지 않아서 나중에 고른 화물이 앞에 온다.
pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection {
  let table =
    list.fold(cargo, dict.new(), fn(previous, item) {
      add_cargo(previous, item, max_weight)
    })
  let #(total, ids) = entry(table, max_weight)
  Selection(total_value: total, ids: ids)
}

/// 표의 칸: #(가치 합, 고른 id들 - 나중에 고른 것이 앞)
type Entry =
  #(Int, List(String))

/// 화물 하나를 더 고려한 새 표. 읽기는 항상 이전 표에서 한다.
fn add_cargo(
  previous: Dict(Int, Entry),
  item: Cargo,
  max_weight: Int,
) -> Dict(Int, Entry) {
  case item.weight > max_weight {
    True -> previous
    False ->
      int.range(
        from: item.weight,
        to: max_weight + 1,
        with: previous,
        run: fn(table, capacity) {
          let #(rest_value, rest_ids) = entry(previous, capacity - item.weight)
          let #(skip_value, _) = entry(previous, capacity)
          case rest_value + item.value > skip_value {
            True ->
              dict.insert(
                table,
                capacity,
                #(rest_value + item.value, [item.id, ..rest_ids]),
              )
            False -> table
          }
        },
      )
  }
}

fn entry(table: Dict(Int, Entry), capacity: Int) -> Entry {
  dict.get(table, capacity) |> result.unwrap(#(0, []))
}
