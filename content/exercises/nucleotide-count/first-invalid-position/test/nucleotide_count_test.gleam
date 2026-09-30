import gleam/dict
import gleeunit/should
import nucleotide_count.{InvalidNucleotide, nucleotide_count}

fn counts(a: Int, c: Int, g: Int, t: Int) {
  dict.from_list([#("A", a), #("C", c), #("G", g), #("T", t)])
}

pub fn empty_strand_test() {
  nucleotide_count("")
  |> should.equal(Ok(counts(0, 0, 0, 0)))
}

pub fn mixed_strand_test() {
  nucleotide_count("GGATTACA")
  |> should.equal(Ok(counts(3, 1, 2, 2)))
}

pub fn reports_letter_and_index_test() {
  nucleotide_count("ACXT")
  |> should.equal(Error(InvalidNucleotide("X", 2)))
}

pub fn reports_first_of_many_test() {
  nucleotide_count("GAUTAZA")
  |> should.equal(Error(InvalidNucleotide("U", 2)))
}

pub fn invalid_at_start_test() {
  nucleotide_count("NACGT")
  |> should.equal(Error(InvalidNucleotide("N", 0)))
}

pub fn lowercase_is_invalid_test() {
  nucleotide_count("ACGtA")
  |> should.equal(Error(InvalidNucleotide("t", 3)))
}
