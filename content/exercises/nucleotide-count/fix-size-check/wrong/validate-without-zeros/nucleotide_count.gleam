import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/string

// 글자마다 검사하도록 고쳤지만, 빈 딕셔너리에서 시작해 0개인 염기의 키가 빠진다.
pub fn nucleotide_count(dna: String) -> Result(Dict(String, Int), Nil) {
  dna
  |> string.to_graphemes
  |> list.try_fold(dict.new(), fn(counts, letter) {
    case letter {
      "A" | "C" | "G" | "T" ->
        Ok(
          dict.upsert(counts, letter, fn(existing) {
            case existing {
              Some(count) -> count + 1
              None -> 1
            }
          }),
        )
      _ -> Error(Nil)
    }
  })
}
