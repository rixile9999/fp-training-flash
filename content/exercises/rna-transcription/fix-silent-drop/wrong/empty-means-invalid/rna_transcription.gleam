import gleam/list
import gleam/string

pub fn to_rna(dna: String) -> Result(String, Nil) {
  let rna =
    dna
    |> string.to_graphemes
    |> list.filter_map(complement)
    |> string.concat
  case rna {
    "" -> Error(Nil)
    _ -> Ok(rna)
  }
}

fn complement(nucleotide: String) -> Result(String, Nil) {
  case nucleotide {
    "G" -> Ok("C")
    "C" -> Ok("G")
    "T" -> Ok("A")
    "A" -> Ok("U")
    _ -> Error(Nil)
  }
}
