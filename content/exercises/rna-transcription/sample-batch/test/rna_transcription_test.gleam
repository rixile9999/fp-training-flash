import gleeunit/should
import rna_transcription.{Sample, transcribe_samples}

pub fn empty_batch_test() {
  transcribe_samples([])
  |> should.equal(Ok([]))
}

pub fn all_valid_test() {
  transcribe_samples([
    Sample("S1", "ACGT"),
    Sample("S2", "GG"),
    Sample("S3", "TTA"),
  ])
  |> should.equal(Ok([#("S1", "UGCA"), #("S2", "CC"), #("S3", "AAU")]))
}

pub fn invalid_sample_test() {
  transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GXG")])
  |> should.equal(Error("S2"))
}

pub fn first_invalid_sample_test() {
  transcribe_samples([
    Sample("S1", "ACGT"),
    Sample("S2", "acgt"),
    Sample("S3", "GATTACA"),
    Sample("S4", "N"),
  ])
  |> should.equal(Error("S2"))
}

pub fn empty_dna_sample_is_valid_test() {
  transcribe_samples([Sample("S1", ""), Sample("S2", "C")])
  |> should.equal(Ok([#("S1", ""), #("S2", "G")]))
}
