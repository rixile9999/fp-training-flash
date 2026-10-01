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
  // There are only four kinds of nucleotide, so more than 4 kinds means there is an invalid letter.
  case dict.size(counts) <= 4 {
    True -> Ok(counts)
    False -> Error(Nil)
  }
}
