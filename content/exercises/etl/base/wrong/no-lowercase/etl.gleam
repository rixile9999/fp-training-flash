import gleam/dict.{type Dict}
import gleam/list

pub fn transform(legacy: Dict(Int, List(String))) -> Dict(String, Int) {
  dict.fold(legacy, dict.new(), fn(result, score, letters) {
    list.fold(letters, result, fn(acc, letter) {
      dict.insert(acc, letter, score)
    })
  })
}
