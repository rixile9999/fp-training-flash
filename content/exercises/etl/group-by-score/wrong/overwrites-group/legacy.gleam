import gleam/dict.{type Dict}
import gleam/string

pub fn to_legacy(scores: Dict(String, Int)) -> Dict(Int, List(String)) {
  dict.fold(scores, dict.new(), fn(groups, letter, score) {
    dict.insert(groups, score, [string.uppercase(letter)])
  })
}
