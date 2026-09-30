import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

// 공백으로 나눈 첫 단어가 "[LEVEL]" 모양이라고 가정한다.
pub fn count_levels(lines: List(String)) -> Dict(String, Int) {
  list.fold(lines, dict.new(), fn(counts, line) {
    let first_word = case string.split(line, " ") {
      [word, ..] -> word
      [] -> ""
    }
    case string.starts_with(first_word, "["), string.ends_with(first_word, "]") {
      True, True -> {
        let level =
          first_word
          |> string.drop_start(1)
          |> string.drop_end(1)
          |> string.uppercase
        dict.upsert(counts, level, fn(count) {
          case count {
            Some(n) -> n + 1
            None -> 1
          }
        })
      }
      _, _ -> counts
    }
  })
}
