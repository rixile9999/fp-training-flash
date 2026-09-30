import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

pub fn to_legacy(scores: Dict(String, Int)) -> Dict(Int, List(String)) {
  scores
  |> dict.fold(dict.new(), fn(groups, letter, score) {
    dict.upsert(groups, score, fn(existing) {
      case existing {
        Some(letters) -> [string.uppercase(letter), ..letters]
        None -> [string.uppercase(letter)]
      }
    })
  })
  |> dict.map_values(fn(_score, letters) { list.sort(letters, string.compare) })
}
