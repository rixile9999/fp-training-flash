import gleeunit/should
import high_school_sweetheart.{first_letter, initial, initials}

pub fn first_letter_test() {
  first_letter("Mary")
  |> should.equal("M")
}

pub fn initial_test() {
  initial("Betty")
  |> should.equal("B.")
}

pub fn initials_test() {
  initials("Linda Miller")
  |> should.equal("L. M.")
}

pub fn initial_lowercase_test() {
  initial("james")
  |> should.equal("J.")
}

pub fn initial_trims_whitespace_test() {
  initial("  zoe ")
  |> should.equal("Z.")
}
