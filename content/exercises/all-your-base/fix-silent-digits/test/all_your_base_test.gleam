import all_your_base.{InvalidBase, InvalidDigit, rebase}
import gleeunit/should

pub fn valid_digits_convert_test() {
  rebase(digits: [1, 0, 1, 0, 1, 0], input_base: 2, output_base: 10)
  |> should.equal(Ok([4, 2]))
}

pub fn digit_too_large_is_error_test() {
  rebase(digits: [1, 2, 1], input_base: 2, output_base: 10)
  |> should.equal(Error(InvalidDigit(2)))
}

pub fn negative_digit_is_error_test() {
  rebase(digits: [1, -1, 1], input_base: 2, output_base: 10)
  |> should.equal(Error(InvalidDigit(-1)))
}

pub fn first_invalid_digit_test() {
  rebase(digits: [3, 9, 8], input_base: 8, output_base: 10)
  |> should.equal(Error(InvalidDigit(9)))
}

pub fn invalid_base_still_first_test() {
  rebase(digits: [5], input_base: 1, output_base: 10)
  |> should.equal(Error(InvalidBase(1)))
}

pub fn zero_value_still_works_test() {
  rebase(digits: [0, 0], input_base: 16, output_base: 2)
  |> should.equal(Ok([0]))
}
