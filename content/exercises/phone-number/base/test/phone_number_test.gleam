import gleeunit/should
import phone_number.{
  InvalidCharacter, InvalidCountryCode, TooFewDigits, TooManyDigits, clean,
}

pub fn cleans_punctuation_test() {
  clean("(223) 456-7890")
  |> should.equal(Ok("2234567890"))
}

pub fn strips_country_code_test() {
  clean("+1 223.456.7890")
  |> should.equal(Ok("2234567890"))
}

pub fn too_few_digits_test() {
  clean("123456789")
  |> should.equal(Error(TooFewDigits))
}

pub fn invalid_country_code_test() {
  clean("22234567890")
  |> should.equal(Error(InvalidCountryCode))
}

pub fn too_many_digits_test() {
  clean("321234567890")
  |> should.equal(Error(TooManyDigits))
}

pub fn letters_rejected_test() {
  clean("223-45a6-7890")
  |> should.equal(Error(InvalidCharacter("a")))
}

pub fn first_invalid_character_test() {
  clean("223-@:!-456-7890")
  |> should.equal(Error(InvalidCharacter("@")))
}

pub fn character_check_before_length_test() {
  clean("555-12x")
  |> should.equal(Error(InvalidCharacter("x")))
}
