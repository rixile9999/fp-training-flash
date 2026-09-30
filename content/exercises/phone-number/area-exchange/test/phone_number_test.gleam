import gleeunit/should
import phone_number.{
  InvalidAreaCode, InvalidExchangeCode, TooFewDigits, check_area_code,
  check_exchange_code, clean,
}

pub fn area_code_zero_test() {
  check_area_code("0234567890")
  |> should.equal(Error(InvalidAreaCode("0")))
}

pub fn area_code_one_test() {
  check_area_code("1234567890")
  |> should.equal(Error(InvalidAreaCode("1")))
}

pub fn exchange_code_one_test() {
  check_exchange_code("2231567890")
  |> should.equal(Error(InvalidExchangeCode("1")))
}

pub fn clean_valid_test() {
  clean("+1 (223) 456-7890")
  |> should.equal(Ok("2234567890"))
}

pub fn exchange_code_zero_test() {
  check_exchange_code("2210567890")
  |> should.equal(Error(InvalidExchangeCode("0")))
}

pub fn area_after_country_code_test() {
  clean("1 (223) 456-7890")
  |> should.equal(Ok("2234567890"))
}

pub fn area_error_before_exchange_error_test() {
  clean("(023) 156-7890")
  |> should.equal(Error(InvalidAreaCode("0")))
}

pub fn normalize_error_first_test() {
  clean("023")
  |> should.equal(Error(TooFewDigits))
}
