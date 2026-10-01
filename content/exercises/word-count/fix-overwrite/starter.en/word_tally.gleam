import gleam/dict.{type Dict}
import gleam/list
import gleam/string

/// Lowercases the space-separated words and counts how many times each appears.
pub fn tally(input: String) -> Dict(String, Int) {
  input
  |> string.lowercase
  |> string.split(" ")
  |> list.filter(fn(word) { word != "" })
  |> list.fold(dict.new(), increment)
}

/// Applies the result of counting one word to counts.
pub fn increment(counts: Dict(String, Int), word: String) -> Dict(String, Int) {
  dict.insert(counts, word, 1)
}
