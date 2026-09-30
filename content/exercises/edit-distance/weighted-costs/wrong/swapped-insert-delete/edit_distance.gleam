import gleam/int
import gleam/list
import gleam/result
import gleam/string

pub type Costs {
  Costs(insert: Int, delete: Int, substitute: Int)
}

// 삽입과 삭제의 방향을 거꾸로 이해해서 두 비용이 뒤바뀌었다.
pub fn distance_with(
  from source: String,
  to target: String,
  costs costs: Costs,
) -> Int {
  let target_chars = string.to_graphemes(target)
  // 첫 행: 빈 문자열에서 앞 j글자를 만들려면 j번 삽입한다.
  let first_row =
    int.range(
      from: list.length(target_chars),
      to: -1,
      with: [],
      run: fn(row, j) { [j * costs.delete, ..row] },
    )
  source
  |> string.to_graphemes
  |> list.index_fold(first_row, fn(previous, char, index) {
    // 첫 칸: 앞 i글자를 빈 문자열로 만들려면 i번 삭제한다.
    let start = { index + 1 } * costs.insert
    fill(previous, target_chars, char, costs, start, [start])
  })
  // 마지막 행의 마지막 값이 답이다. 행은 비어 있지 않다.
  |> list.last
  |> result.unwrap(0)
}

/// 윗행 previous = [d(i-1, 0), ..., d(i-1, m)]에서 현재 행을 만든다.
/// 위(above)에서 오면 삭제, 왼쪽(left)에서 오면 삽입, 대각선(diagonal)에서 오면 바꾸기다.
fn fill(
  previous: List(Int),
  target: List(String),
  char: String,
  costs: Costs,
  left: Int,
  acc: List(Int),
) -> List(Int) {
  case previous, target {
    [diagonal, above, ..rest], [t, ..ts] -> {
      let replace = case t == char {
        True -> diagonal
        False -> diagonal + costs.substitute
      }
      let value =
        int.min(replace, int.min(above + costs.insert, left + costs.delete))
      fill([above, ..rest], ts, char, costs, value, [value, ..acc])
    }
    _, _ -> list.reverse(acc)
  }
}
