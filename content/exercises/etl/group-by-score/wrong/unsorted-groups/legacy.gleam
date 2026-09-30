import gleam/dict.{type Dict}
import gleam/option.{None, Some}
import gleam/string

pub fn to_legacy(scores: Dict(String, Int)) -> Dict(Int, List(String)) {
  dict.fold(scores, dict.new(), fn(groups, letter, score) {
    dict.upsert(groups, score, fn(existing) {
      case existing {
        Some(letters) -> [string.uppercase(letter), ..letters]
        None -> [string.uppercase(letter)]
      }
    })
  })
}
