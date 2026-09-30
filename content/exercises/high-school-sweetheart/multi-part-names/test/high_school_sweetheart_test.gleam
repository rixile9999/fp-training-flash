import gleeunit/should
import high_school_sweetheart.{initials, monogram, name_parts}

pub fn name_parts_test() {
  name_parts("Mary Jane Watson")
  |> should.equal(["Mary", "Jane", "Watson"])
}

pub fn name_parts_extra_spaces_test() {
  name_parts("  mary   jane ")
  |> should.equal(["mary", "jane"])
}

pub fn initials_three_parts_test() {
  initials("mary jane watson")
  |> should.equal("M. J. W.")
}

pub fn initials_extra_spaces_test() {
  initials("  Peter   Parker  ")
  |> should.equal("P. P.")
}

pub fn initials_blank_test() {
  initials("   ")
  |> should.equal("")
}

pub fn monogram_test() {
  monogram("grace brewster hopper")
  |> should.equal("GBH")
}

pub fn monogram_single_name_test() {
  monogram("cher")
  |> should.equal("C")
}
