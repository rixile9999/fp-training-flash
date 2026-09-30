import all_your_base.{InvalidBase, InvalidDigit, rebase}
import gleeunit/should

pub fn binary_to_decimal_test() {
  rebase(digits: [1, 0, 1, 0, 1, 0], input_base: 2, output_base: 10)
  |> should.equal(Ok([4, 2]))
}

pub fn trinary_to_hexadecimal_test() {
  rebase(digits: [1, 1, 2, 0], input_base: 3, output_base: 16)
  |> should.equal(Ok([2, 10]))
}

pub fn input_base_one_is_error_test() {
  rebase(digits: [0], input_base: 1, output_base: 10)
  |> should.equal(Error(InvalidBase(1)))
}

pub fn zero_value_test() {
  rebase(digits: [0, 0, 0], input_base: 10, output_base: 2)
  |> should.equal(Ok([0]))
  rebase(digits: [], input_base: 2, output_base: 10)
  |> should.equal(Ok([0]))
}

pub fn digit_too_large_test() {
  rebase(digits: [1, 2, 1, 0], input_base: 2, output_base: 10)
  |> should.equal(Error(InvalidDigit(2)))
}

pub fn negative_digit_test() {
  rebase(digits: [1, -1, 1, 0], input_base: 2, output_base: 10)
  |> should.equal(Error(InvalidDigit(-1)))
}

pub fn output_base_zero_is_error_test() {
  rebase(digits: [7], input_base: 10, output_base: 0)
  |> should.equal(Error(InvalidBase(0)))
}

pub fn input_base_checked_first_test() {
  rebase(digits: [1], input_base: -2, output_base: -7)
  |> should.equal(Error(InvalidBase(-2)))
}
