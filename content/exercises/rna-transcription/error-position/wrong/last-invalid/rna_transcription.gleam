import gleam/list
import gleam/string

pub type TranscriptionError {
  InvalidNucleotide(position: Int, found: String)
}

pub fn to_rna(dna: String) -> Result(String, TranscriptionError) {
  dna
  |> string.to_graphemes
  |> list.index_fold(Ok(""), fn(acc, nucleotide, position) {
    case complement(nucleotide), acc {
      Error(_), _ -> Error(InvalidNucleotide(position, nucleotide))
      Ok(rna), Ok(so_far) -> Ok(so_far <> rna)
      Ok(_), Error(error) -> Error(error)
    }
  })
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
