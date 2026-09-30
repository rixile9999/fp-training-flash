import gleam/dict.{type Dict}
import gleam/list
import gleam/option
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  input
  |> string.lowercase
  |> string.split(" ")
  |> list.filter(fn(word) { word != "" })
  |> list.fold(dict.new(), increment)
}

fn increment(counts: Dict(String, Int), word: String) -> Dict(String, Int) {
  dict.upsert(counts, word, fn(previous) { option.unwrap(previous, 0) + 1 })
}
