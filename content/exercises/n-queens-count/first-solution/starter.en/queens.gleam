import gleam/int
import gleam/list

/// `placed` holds the column numbers of the queens placed in the rows above. The queen in the row just above comes first.
/// True if a queen placed in column `col` of the next row attacks none of them.
pub fn is_safe(placed: List(Int), col: Int) -> Bool {
  check(placed, col, 1)
}

fn check(placed: List(Int), col: Int, distance: Int) -> Bool {
  case placed {
    [] -> True
    [c, ..rest] ->
      c != col
      && int.absolute_value(c - col) != distance
      && check(rest, col, distance + 1)
  }
}

pub fn first_solution(n: Int) -> Result(List(Int), Nil) {
  todo
}
