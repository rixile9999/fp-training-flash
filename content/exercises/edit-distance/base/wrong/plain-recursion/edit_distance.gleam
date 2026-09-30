import gleam/int
import gleam/list
import gleam/string

pub fn distance(from source: String, to target: String) -> Int {
  go(string.to_graphemes(source), string.to_graphemes(target))
}

// 정의를 그대로 재귀로 옮겼다. 답은 맞지만 같은 (남은 앞, 남은 뒤) 쌍을
// 수없이 다시 계산해서, 글자가 하나 늘 때마다 호출 수가 몇 배로 늘어난다.
fn go(a: List(String), b: List(String)) -> Int {
  case a, b {
    [], _ -> list.length(b)
    _, [] -> list.length(a)
    [x, ..xs], [y, ..ys] if x == y -> go(xs, ys)
    [_, ..xs], [_, ..ys] ->
      1 + int.min(go(xs, ys), int.min(go(xs, b), go(a, ys)))
  }
}
