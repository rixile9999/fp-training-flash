import gleam/dict.{type Dict}
import gleam/list
import gleam/string

pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), Nil) {
  dna
  |> string.to_graphemes
  |> list.try_fold(zeros(), count_one)
}

fn zeros() -> Dict(String, Int) {
  dict.from_list([#("A", 0), #("C", 0), #("G", 0), #("T", 0)])
}

fn count_one(
  counts: Dict(String, Int),
  letter: String,
) -> Result(Dict(String, Int), Nil) {
  case dict.get(counts, letter) {
    Ok(count) -> Ok(dict.insert(counts, letter, count + 1))
    Error(Nil) -> Error(Nil)
  }
}
