import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

/// 공백으로 나뉜 단어를 소문자로 바꿔 등장 횟수를 센다.
pub fn tally(input: String) -> Dict(String, Int) {
  input
  |> string.lowercase
  |> string.split(" ")
  |> list.filter(fn(word) { word != "" })
  |> list.fold(dict.new(), increment)
}

/// 단어 하나를 센 결과를 counts에 반영한다.
pub fn increment(counts: Dict(String, Int), word: String) -> Dict(String, Int) {
  dict.upsert(counts, word, fn(previous) {
    case previous {
      Some(count) -> count + 1
      None -> 1
    }
  })
}
