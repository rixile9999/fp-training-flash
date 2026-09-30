import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

pub fn to_legacy(scores: Dict(String, Int)) -> Dict(Int, List(String)) {
  dict.fold(scores, dict.new(), fn(groups, tile, score) {
    dict.upsert(groups, score, fn(existing) {
      case existing {
        Some(tiles) -> list.append(tiles, [string.uppercase(tile)])
        None -> [string.uppercase(tile)]
      }
    })
  })
}
