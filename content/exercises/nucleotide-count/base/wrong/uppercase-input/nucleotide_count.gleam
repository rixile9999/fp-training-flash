import gleam/dict.{type Dict}
import gleam/list
import gleam/string

// 입력을 먼저 대문자로 바꿔서 소문자 염기도 유효한 글자로 받아들인다.
pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), Nil) {
  let zeros = dict.from_list([#("A", 0), #("C", 0), #("G", 0), #("T", 0)])
  dna
  |> string.uppercase
  |> string.to_graphemes
  |> list.try_fold(zeros, fn(counts, letter) {
    case dict.get(counts, letter) {
      Ok(count) -> Ok(dict.insert(counts, letter, count + 1))
      Error(Nil) -> Error(Nil)
    }
  })
}
