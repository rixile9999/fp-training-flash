import gleam/dict.{type Dict}
import gleam/list
import gleam/string

/// 把以空格分隔的单词转成小写，统计出现次数。
pub fn tally(input: String) -> Dict(String, Int) {
  input
  |> string.lowercase
  |> string.split(" ")
  |> list.filter(fn(word) { word != "" })
  |> list.fold(dict.new(), increment)
}

/// 把统计一个单词的结果反映到 counts 中。
pub fn increment(counts: Dict(String, Int), word: String) -> Dict(String, Int) {
  dict.insert(counts, word, 1)
}
