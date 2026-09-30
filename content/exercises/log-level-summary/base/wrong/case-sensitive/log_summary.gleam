import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

// 레벨을 대문자로 바꾸지 않아 "warn"과 "WARN"을 다른 키로 센다.
pub fn count_levels(lines: List(String)) -> Dict(String, Int) {
  list.fold(lines, dict.new(), fn(counts, line) {
    case line {
      "[" <> rest ->
        case string.split_once(rest, "]") {
          Ok(#(level, _)) ->
            dict.upsert(counts, level, fn(count) {
              case count {
                Some(n) -> n + 1
                None -> 1
              }
            })
          Error(Nil) -> counts
        }
      _ -> counts
    }
  })
}
