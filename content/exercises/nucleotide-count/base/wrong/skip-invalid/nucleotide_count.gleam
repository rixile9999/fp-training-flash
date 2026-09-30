import gleam/dict.{type Dict}
import gleam/list
import gleam/string

// 잘못된 글자를 건너뛰기만 하고 오류로 알리지 않는다.
pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), Nil) {
  let zeros = dict.from_list([#("A", 0), #("C", 0), #("G", 0), #("T", 0)])
  let counts =
    dna
    |> string.to_graphemes
    |> list.fold(zeros, fn(counts, letter) {
      case dict.get(counts, letter) {
        Ok(count) -> dict.insert(counts, letter, count + 1)
        Error(Nil) -> counts
      }
    })
  Ok(counts)
}
