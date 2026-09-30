import gleam/int

/// `placed`는 위쪽 행들에 놓은 퀸의 열 번호다. 바로 윗 행의 퀸이 맨 앞에 있다.
/// 다음 행의 `col` 열에 퀸을 놓아도 아무 퀸과도 공격하지 않으면 True.
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

// row 행부터 끝까지 채우는 방법의 수.
fn place(n: Int, row: Int, placed: List(Int)) -> Int {
  case row == n {
    True -> 1
    False ->
      int.range(from: 0, to: n, with: 0, run: fn(total, col) {
        case is_safe(placed, col) {
          True -> total + place(n, row + 1, [col, ..placed])
          False -> total
        }
      })
  }
}
