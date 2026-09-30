import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result

pub type Item {
  Item(value: Int, weight: Int)
}

/// 표: 무게 한도 -> 지금까지 고려한 화물로 얻는 최대 가치 (없는 칸은 0)
pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int {
  items
  |> list.fold(dict.new(), fn(previous, item) {
    add_item(previous, item, maximum_weight)
  })
  |> best(maximum_weight)
}

// "안 싣는다" 쪽만 이전 표에서 읽고, "싣는다" 쪽은 여전히 새 표에서 읽는다.
fn add_item(
  previous: Dict(Int, Int),
  item: Item,
  maximum_weight: Int,
) -> Dict(Int, Int) {
  case item.weight > maximum_weight {
    True -> previous
    False ->
      int.range(
        from: item.weight,
        to: maximum_weight + 1,
        with: previous,
        run: fn(table, capacity) {
          let take = best(table, capacity - item.weight) + item.value
          case take > best(previous, capacity) {
            True -> dict.insert(table, capacity, take)
            False -> table
          }
        },
      )
  }
}

fn best(table: Dict(Int, Int), capacity: Int) -> Int {
  dict.get(table, capacity) |> result.unwrap(0)
}
