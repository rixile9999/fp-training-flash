import gleam/dict.{type Dict}
import gleam/list
import gleam/string

// 개수를 늘리지 않고 매번 1로 덮어쓴다.
pub fn count_levels(lines: List(String)) -> Dict(String, Int) {
  list.fold(lines, dict.new(), fn(counts, line) {
    case line {
      "[" <> rest ->
        case string.split_once(rest, "]") {
          Ok(#(level, _)) -> dict.insert(counts, string.uppercase(level), 1)
          Error(Nil) -> counts
        }
      _ -> counts
    }
  })
}
