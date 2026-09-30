import gleeunit/should
import isbn_verifier.{
  ChecksumMismatch, InvalidCharacter, WrongLength, validate,
}

pub fn valid_returns_values_test() {
  validate("3-598-21507-X")
  |> should.equal(Ok([3, 5, 9, 8, 2, 1, 5, 0, 7, 10]))
}

pub fn wrong_length_test() {
  validate("3-598-21507")
  |> should.equal(Error(WrongLength(9)))
}

pub fn invalid_character_position_test() {
  validate("3-598-P1581-X")
  |> should.equal(Error(InvalidCharacter(position: 4, found: "P")))
}

pub fn checksum_mismatch_test() {
  validate("3-598-21508-9")
  |> should.equal(Error(ChecksumMismatch))
}

pub fn x_in_middle_test() {
  validate("3-598-2X507-9")
  |> should.equal(Error(InvalidCharacter(position: 5, found: "X")))
}

pub fn length_checked_before_characters_test() {
  validate("3598P215088")
  |> should.equal(Error(WrongLength(11)))
}

pub fn lowercase_x_rejected_test() {
  validate("359821507x")
  |> should.equal(Error(InvalidCharacter(position: 9, found: "x")))
}
