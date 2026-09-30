import gleam/int
import gleam/list
import gleam/result
import gleam/string

pub type Costs {
  Costs(insert: Int, delete: Int, substitute: Int)
}

pub fn distance_with(
  from source: String,
  to target: String,
  costs costs: Costs,
) -> Int {
  todo
}
