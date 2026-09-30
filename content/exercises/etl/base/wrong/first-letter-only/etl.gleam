import gleam/dict.{type Dict}
import gleam/string

pub fn transform(legacy: Dict(Int, List(String))) -> Dict(String, Int) {
  dict.fold(legacy, dict.new(), fn(result, score, letters) {
    case letters {
      [first, ..] -> dict.insert(result, string.lowercase(first), score)
      [] -> result
    }
  })
}
