import gleam/dict.{type Dict}
import gleam/list
import gleam/option
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  input
  |> string.lowercase
  |> string.to_graphemes
  |> list.map(fn(g) {
    case is_word_char(g) {
      True -> g
      False -> " "
    }
  })
  |> string.concat
  |> string.split(" ")
  |> list.filter(fn(word) { word != "" })
  |> list.fold(dict.new(), increment)
}

fn increment(counts: Dict(String, Int), word: String) -> Dict(String, Int) {
  dict.upsert(counts, word, fn(previous) { option.unwrap(previous, 0) + 1 })
}

/// 영문 소문자나 숫자 한 글자이면 True. (이미 완성된 함수)
fn is_word_char(grapheme: String) -> Bool {
  string.contains("abcdefghijklmnopqrstuvwxyz0123456789", grapheme)
}
