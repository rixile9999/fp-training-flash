import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/result

pub type Item {
  Item(value: Int, weight: Int)
}

pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int {
  todo
}
