import gleam/dict.{type Dict}
import gleam/list
import gleam/result
import gleam/string

pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}

// 오류를 만나도 멈추지 않아서, 뒤에 나온 오류가 앞의 오류를 덮어쓴다.
pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), CountError) {
  let zeros = dict.from_list([#("A", 0), #("C", 0), #("G", 0), #("T", 0)])
  dna
  |> string.to_graphemes
  |> list.index_fold(Ok(zeros), fn(acc, letter, index) {
    case dict.get(zeros, letter) {
      Error(Nil) -> Error(InvalidNucleotide(letter, index))
      Ok(_) ->
        result.map(acc, fn(counts) {
          case dict.get(counts, letter) {
            Ok(count) -> dict.insert(counts, letter, count + 1)
            Error(Nil) -> counts
          }
        })
    }
  })
}
