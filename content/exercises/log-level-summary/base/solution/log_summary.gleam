import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

pub fn count_levels(lines: List(String)) -> Dict(String, Int) {
  list.fold(lines, dict.new(), fn(counts, line) {
    case level_of(line) {
      Ok(level) -> dict.upsert(counts, level, increment)
      Error(Nil) -> counts
    }
  })
}

fn level_of(line: String) -> Result(String, Nil) {
  case line {
    "[" <> rest ->
      case string.split_once(rest, "]") {
        Ok(#(level, _message)) -> Ok(string.uppercase(level))
        Error(Nil) -> Error(Nil)
      }
    _ -> Error(Nil)
  }
}

fn increment(count: option.Option(Int)) -> Int {
  case count {
    Some(n) -> n + 1
    None -> 1
  }
}
