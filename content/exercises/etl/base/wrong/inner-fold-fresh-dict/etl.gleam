import gleam/dict.{type Dict}
import gleam/list
import gleam/string

pub fn transform(legacy: Dict(Int, List(String))) -> Dict(String, Int) {
  dict.fold(legacy, dict.new(), fn(_result, score, letters) {
    list.fold(letters, dict.new(), fn(acc, letter) {
      dict.insert(acc, string.lowercase(letter), score)
    })
  })
}
