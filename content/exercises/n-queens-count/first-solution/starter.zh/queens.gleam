import gleam/int
import gleam/list

/// `placed` 是上方各行已放皇后的列号，紧邻上一行的皇后排在最前面。
/// 如果在下一行的第 `col` 列放皇后不会与任何皇后互相攻击，则为 True。
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
