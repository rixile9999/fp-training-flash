import gleeunit/should
import isbn_verifier.{is_valid}

pub fn valid_isbn_test() {
  is_valid("3-598-21508-8")
  |> should.be_true
}

pub fn valid_with_x_check_digit_test() {
  is_valid("3-598-21507-X")
  |> should.be_true
}

pub fn invalid_check_digit_test() {
  is_valid("3-598-21508-9")
  |> should.be_false
}

pub fn letter_does_not_crash_test() {
  is_valid("3-598-2A508-8")
  |> should.be_false
}

pub fn invalid_character_not_zero_test() {
  is_valid("3-598-P1581-X")
  |> should.be_false
}

pub fn x_in_middle_test() {
  is_valid("3-598-2X507-9")
  |> should.be_false
}

pub fn lowercase_x_test() {
  is_valid("359821507x")
  |> should.be_false
}
