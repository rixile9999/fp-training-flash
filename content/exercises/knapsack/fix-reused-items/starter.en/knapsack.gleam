import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result

pub type Item {
  Item(value: Int, weight: Int)
}

/// Table: weight limit -> maximum value from the parcels considered so far (a missing cell is 0)
pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int {
  items
  |> list.fold(dict.new(), fn(previous, item) {
    add_item(previous, item, maximum_weight)
  })
  |> best(maximum_weight)
}

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
          case take > best(table, capacity) {
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
