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

pub fn best_selection(cargo: List(Cargo), max_weight: Int) -> Selection {
  todo
}
