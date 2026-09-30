import gleeunit/should
import rna_transcription.{to_rna}

pub fn empty_strand_test() {
  to_rna("")
  |> should.equal(Ok(""))
}

pub fn each_nucleotide_complement_test() {
  to_rna("GCTA")
  |> should.equal(Ok("CGAU"))
}

pub fn long_strand_test() {
  to_rna("ACGTGGTCTTAA")
  |> should.equal(Ok("UGCACCAGAAUU"))
}

pub fn invalid_strand_test() {
  to_rna("INVALID")
  |> should.equal(Error(Nil))
}

pub fn invalid_at_end_test() {
  to_rna("ACGTX")
  |> should.equal(Error(Nil))
}

pub fn lowercase_rejected_test() {
  to_rna("acgt")
  |> should.equal(Error(Nil))
}
