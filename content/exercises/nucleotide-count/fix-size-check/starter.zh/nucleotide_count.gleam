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
  // 碱基只有四种，种类超过 4 个就说明有错误字母。
  case dict.size(counts) <= 4 {
    True -> Ok(counts)
    False -> Error(Nil)
  }
}
