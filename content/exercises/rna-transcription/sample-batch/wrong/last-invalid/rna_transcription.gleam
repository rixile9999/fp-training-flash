import gleam/list
import gleam/result
import gleam/string

pub type Sample {
  Sample(id: String, dna: String)
}

pub fn transcribe_samples(
  samples: List(Sample),
) -> Result(List(#(String, String)), String) {
  samples
  |> list.fold(Ok([]), fn(acc, sample) {
    case to_rna(sample.dna), acc {
      Error(Nil), _ -> Error(sample.id)
      Ok(rna), Ok(done) -> Ok([#(sample.id, rna), ..done])
      Ok(_), Error(id) -> Error(id)
    }
  })
  |> result.map(list.reverse)
}

pub fn to_rna(dna: String) -> Result(String, Nil) {
  dna
  |> string.to_graphemes
  |> list.try_map(complement)
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
