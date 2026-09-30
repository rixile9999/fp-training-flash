import gleam/list
import gleam/result
import gleam/string

pub type TranscriptionError {
  InvalidNucleotide(position: Int, found: String)
}

pub fn to_rna(dna: String) -> Result(String, TranscriptionError) {
  dna
  |> string.to_graphemes
  |> list.index_map(fn(nucleotide, index) { #(index + 1, nucleotide) })
  |> list.try_map(fn(pair) {
    let #(position, nucleotide) = pair
    complement(nucleotide)
    |> result.replace_error(InvalidNucleotide(position, nucleotide))
  })
  |> result.map(string.concat)
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
