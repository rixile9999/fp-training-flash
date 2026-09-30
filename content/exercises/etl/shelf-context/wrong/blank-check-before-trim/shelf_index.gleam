import gleam/dict.{type Dict}
import gleam/list
import gleam/string

pub fn index_by_code(shelves: Dict(String, List(String))) -> Dict(String, String) {
  dict.fold(shelves, dict.new(), fn(index, shelf, codes) {
    list.fold(codes, index, fn(acc, raw) {
      case raw {
        "" -> acc
        _ -> dict.insert(acc, normalize(raw), shelf)
      }
    })
  })
}

fn normalize(raw: String) -> String {
  raw
  |> string.trim
  |> string.uppercase
}
