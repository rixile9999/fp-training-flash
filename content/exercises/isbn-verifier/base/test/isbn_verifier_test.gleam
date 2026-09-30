import gleeunit/should
import isbn_verifier.{is_valid}

pub fn valid_isbn_test() {
  is_valid("3-598-21508-8")
  |> should.be_true
}

pub fn invalid_check_digit_test() {
  is_valid("3-598-21508-9")
  |> should.be_false
}

pub fn valid_with_x_check_digit_test() {
  is_valid("3-598-21507-X")
  |> should.be_true
}

pub fn valid_without_dashes_test() {
  is_valid("3598215088")
  |> should.be_true
}

pub fn x_only_valid_as_check_digit_test() {
  is_valid("3-598-2X507-9")
  |> should.be_false
}

pub fn invalid_character_not_zero_test() {
  is_valid("3-598-P1581-X")
  |> should.be_false
}

pub fn too_long_test() {
  is_valid("98245726788")
  |> should.be_false
}

pub fn empty_isbn_test() {
  is_valid("")
  |> should.be_false
}
