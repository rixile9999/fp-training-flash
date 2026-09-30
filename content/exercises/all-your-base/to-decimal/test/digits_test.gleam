import digits.{InvalidBase, InvalidDigit, from_digits}
import gleeunit/should

pub fn binary_digits_test() {
  from_digits([1, 0, 1], 2)
  |> should.equal(Ok(5))
}

pub fn decimal_digits_test() {
  from_digits([4, 2], 10)
  |> should.equal(Ok(42))
}

pub fn digit_equal_to_base_test() {
  from_digits([1, 2, 1], 2)
  |> should.equal(Error(InvalidDigit(2)))
}

pub fn empty_digits_is_zero_test() {
  from_digits([], 7)
  |> should.equal(Ok(0))
}

pub fn negative_digit_test() {
  from_digits([3, -3, 1], 8)
  |> should.equal(Error(InvalidDigit(-3)))
}

pub fn first_invalid_digit_test() {
  from_digits([1, 5, 2, 7], 5)
  |> should.equal(Error(InvalidDigit(5)))
}

pub fn base_below_two_test() {
  from_digits([0, 9], 1)
  |> should.equal(Error(InvalidBase(1)))
}
