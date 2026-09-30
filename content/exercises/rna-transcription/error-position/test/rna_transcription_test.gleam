import gleeunit/should
import rna_transcription.{InvalidNucleotide, to_rna}

pub fn valid_strand_test() {
  to_rna("ACGTGGTCTTAA")
  |> should.equal(Ok("UGCACCAGAAUU"))
}

pub fn invalid_first_test() {
  to_rna("XACG")
  |> should.equal(Error(InvalidNucleotide(position: 0, found: "X")))
}

pub fn rna_base_in_dna_test() {
  to_rna("ACGU")
  |> should.equal(Error(InvalidNucleotide(position: 3, found: "U")))
}

pub fn first_invalid_reported_test() {
  to_rna("AXCYG")
  |> should.equal(Error(InvalidNucleotide(position: 1, found: "X")))
}

pub fn empty_strand_test() {
  to_rna("")
  |> should.equal(Ok(""))
}
