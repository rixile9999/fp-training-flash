import gleam/dict.{type Dict}
import gleam/int
import gleam/list
import gleam/string

pub fn distance(from source: String, to target: String) -> Int {
  go(string.to_graphemes(source), string.to_graphemes(target))
}

/// 把 a 变成 b 所需的最少编辑次数
fn go(a: List(String), b: List(String)) -> Int {
  case a, b {
    [], _ -> list.length(b)
    _, [] -> list.length(a)
    [x, ..xs], [y, ..ys] if x == y -> go(xs, ys)
    [_, ..xs], [_, ..ys] ->
      1 + int.min(go(xs, ys), int.min(go(xs, b), go(a, ys)))
  }
}
