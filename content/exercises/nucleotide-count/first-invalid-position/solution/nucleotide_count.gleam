import gleam/dict.{type Dict}
import gleam/list
import gleam/string

pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}

pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), CountError) {
  dna
  |> string.to_graphemes
  |> list.index_map(fn(letter, index) { #(letter, index) })
  |> list.try_fold(zeros(), count_one)
}

fn zeros() -> Dict(String, Int) {
  dict.from_list([#("A", 0), #("C", 0), #("G", 0), #("T", 0)])
}

fn count_one(
  counts: Dict(String, Int),
  pair: #(String, Int),
) -> Result(Dict(String, Int), CountError) {
  let #(letter, index) = pair
  case dict.get(counts, letter) {
    Ok(count) -> Ok(dict.insert(counts, letter, count + 1))
    Error(Nil) -> Error(InvalidNucleotide(letter, index))
  }
}
