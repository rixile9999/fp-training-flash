import gleam/int
import gleam/list
import gleam/result
import gleam/string

pub fn distance(from source: String, to target: String) -> Int {
  let target_chars = string.to_graphemes(target)
  // 첫 행: 빈 문자열에서 앞 j글자를 만들려면 j번 삽입한다.
  let first_row =
    int.range(
      from: list.length(target_chars),
      to: -1,
      with: [],
      run: fn(row, j) { [j, ..row] },
    )
  source
  |> string.to_graphemes
  |> list.index_fold(first_row, fn(previous, char, index) {
    // 첫 칸: 앞 i글자를 빈 문자열로 만들려면 i번 삭제한다.
    let i = index + 1
    fill(previous, target_chars, char, i, [i])
  })
  // 마지막 행의 마지막 값이 답이다. 행은 비어 있지 않다.
  |> list.last
  |> result.unwrap(0)
}

/// 윗행 previous = [d(i-1, 0), d(i-1, 1), ..., d(i-1, m)]에서
/// 현재 행 [d(i, 0), ..., d(i, m)]을 만든다. left는 현재 행에서 방금 계산한 값이다.
fn fill(
  previous: List(Int),
  target: List(String),
  char: String,
  left: Int,
  acc: List(Int),
) -> List(Int) {
  case previous, target {
    [diagonal, above, ..rest], [t, ..ts] -> {
      let replace = case t == char {
        True -> diagonal
        False -> diagonal + 1
      }
      let value = int.min(replace, int.min(above + 1, left + 1))
      fill([above, ..rest], ts, char, value, [value, ..acc])
    }
    _, _ -> list.reverse(acc)
  }
}
