import gleam/int

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

pub fn count_solutions(n: Int) -> Int {
  place(n, 0, [])
}

// The number of ways to fill the board from row `row` to the end.
fn place(n: Int, row: Int, placed: List(Int)) -> Int {
  case row == n {
    True -> 1
    False ->
      int.range(from: 0, to: n, with: 0, run: fn(total, col) {
        case is_safe(placed, col) {
          True -> place(n, row + 1, [col, ..placed])
          False -> total
        }
      })
  }
}
