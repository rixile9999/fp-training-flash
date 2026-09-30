import gleam/dict.{type Dict}
import gleam/int
import gleam/list

pub type ChangeError {
  ImpossibleTarget
}

pub fn find_fewest_coins(
  coins: List(Int),
  target: Int,
) -> Result(List(Int), ChangeError) {
  todo
}
