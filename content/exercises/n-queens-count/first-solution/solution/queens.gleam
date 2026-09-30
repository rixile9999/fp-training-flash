import gleam/int
import gleam/list
import gleam/result

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

pub fn first_solution(n: Int) -> Result(List(Int), Nil) {
  search(n, 0, [])
  |> result.map(list.reverse)
}

// placed를 이어 받아 row 행부터 끝까지 채운 첫 배치. placed와 같은 순서(아래 행이 앞)다.
fn search(n: Int, row: Int, placed: List(Int)) -> Result(List(Int), Nil) {
  case row == n {
    True -> Ok(placed)
    False -> try_columns(n, row, placed, 0)
  }
}

// col 열부터 오른쪽으로 차례로 시도한다.
fn try_columns(
  n: Int,
  row: Int,
  placed: List(Int),
  col: Int,
) -> Result(List(Int), Nil) {
  case col >= n {
    True -> Error(Nil)
    False -> {
      let found = case is_safe(placed, col) {
        True -> search(n, row + 1, [col, ..placed])
        False -> Error(Nil)
      }
      case found {
        Ok(solution) -> Ok(solution)
        Error(Nil) -> try_columns(n, row, placed, col + 1)
      }
    }
  }
}
