import gleam/dict
import gleeunit/should
import nucleotide_count.{nucleotide_count}

fn counts(a: Int, c: Int, g: Int, t: Int) {
  dict.from_list([#("A", a), #("C", c), #("G", g), #("T", t)])
}

pub fn empty_strand_test() {
  nucleotide_count("")
  |> should.equal(Ok(counts(0, 0, 0, 0)))
}

pub fn single_nucleotide_test() {
  nucleotide_count("G")
  |> should.equal(Ok(counts(0, 0, 1, 0)))
}

pub fn mixed_strand_test() {
  nucleotide_count("GATTACA")
  |> should.equal(Ok(counts(3, 1, 1, 2)))
}

pub fn invalid_strand_test() {
  nucleotide_count("AGXXACT")
  |> should.equal(Error(Nil))
}

pub fn repeated_nucleotide_test() {
  nucleotide_count(
    "AGCTTTTCATTCTGACTGCAACGGGCAATATGTCTCTGTGTGGATTAAAAAAAGAGTGTCTGATAGCAGC",
  )
  |> should.equal(Ok(counts(20, 12, 17, 21)))
}

pub fn invalid_at_end_test() {
  nucleotide_count("ACGTN")
  |> should.equal(Error(Nil))
}

pub fn lowercase_is_invalid_test() {
  nucleotide_count("ACgT")
  |> should.equal(Error(Nil))
}
