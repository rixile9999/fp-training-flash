import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), Nil) {
  let counts =
    dna
    |> string.to_graphemes
    |> list.fold(dict.new(), fn(counts, letter) {
      dict.upsert(counts, letter, fn(existing) {
        case existing {
          Some(count) -> count + 1
          None -> 1
        }
      })
    })
  // 염기는 네 종류뿐이니, 종류가 4개를 넘으면 잘못된 글자가 있는 것이다.
  case dict.size(counts) <= 4 {
    True -> Ok(counts)
    False -> Error(Nil)
  }
}
