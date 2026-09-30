import gleeunit/should
import rna_transcription.{to_rna}

pub fn valid_strand_test() {
  to_rna("GATTACA")
  |> should.equal(Ok("CUAAUGU"))
}

pub fn empty_strand_test() {
  to_rna("")
  |> should.equal(Ok(""))
}

pub fn invalid_in_middle_test() {
  to_rna("ACXT")
  |> should.equal(Error(Nil))
}

pub fn all_invalid_test() {
  to_rna("XYZ")
  |> should.equal(Error(Nil))
}

pub fn rna_base_rejected_test() {
  to_rna("ACGU")
  |> should.equal(Error(Nil))
}
