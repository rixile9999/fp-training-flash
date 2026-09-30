import gleam/list
import gleam/result
import gleam/string

pub type Sample {
  Sample(id: String, dna: String)
}

pub fn transcribe_samples(
  samples: List(Sample),
) -> Result(List(#(String, String)), String) {
  list.try_map(samples, transcribe_sample)
}

fn transcribe_sample(sample: Sample) -> Result(#(String, String), String) {
  to_rna(sample.dna)
  |> result.map(fn(rna) { #(sample.id, rna) })
  |> result.replace_error(sample.id)
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
