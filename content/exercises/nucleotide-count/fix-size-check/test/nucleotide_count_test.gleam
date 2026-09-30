import gleam/dict
import gleeunit/should
import nucleotide_count.{nucleotide_count}

fn counts(a: Int, c: Int, g: Int, t: Int) {
  dict.from_list([#("A", a), #("C", c), #("G", g), #("T", t)])
}

pub fn mixed_strand_test() {
  nucleotide_count("GATTACA")
  |> should.equal(Ok(counts(3, 1, 1, 2)))
}

pub fn empty_strand_test() {
  nucleotide_count("")
  |> should.equal(Ok(counts(0, 0, 0, 0)))
}

pub fn invalid_with_few_kinds_test() {
  nucleotide_count("AAX")
  |> should.equal(Error(Nil))
}

pub fn missing_kinds_are_zero_test() {
  nucleotide_count("CCGC")
  |> should.equal(Ok(counts(0, 3, 1, 0)))
}

pub fn invalid_single_letter_test() {
  nucleotide_count("U")
  |> should.equal(Error(Nil))
}

pub fn invalid_with_all_kinds_test() {
  nucleotide_count("ACGTN")
  |> should.equal(Error(Nil))
}
