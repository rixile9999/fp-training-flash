import gleam/dict.{type Dict}
import gleam/list
import gleam/string

pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}

// 위치를 1부터 센다.
pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), CountError) {
  let zeros = dict.from_list([#("A", 0), #("C", 0), #("G", 0), #("T", 0)])
  dna
  |> string.to_graphemes
  |> list.index_map(fn(letter, index) { #(letter, index + 1) })
  |> list.try_fold(zeros, fn(counts, pair) {
    let #(letter, position) = pair
    case dict.get(counts, letter) {
      Ok(count) -> Ok(dict.insert(counts, letter, count + 1))
      Error(Nil) -> Error(InvalidNucleotide(letter, position))
    }
  })
}
