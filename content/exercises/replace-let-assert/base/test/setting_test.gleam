import gleeunit/should
import setting.{MissingEquals, NotANumber, Setting, parse_setting}

pub fn parses_valid_setting_test() {
  parse_setting("retries=3")
  |> should.equal(Ok(Setting("retries", 3)))
}

pub fn missing_equals_is_error_test() {
  parse_setting("retries 3")
  |> should.equal(Error(MissingEquals("retries 3")))
}

pub fn not_a_number_is_error_test() {
  parse_setting("retries=three")
  |> should.equal(Error(NotANumber("three")))
}

pub fn negative_number_is_valid_test() {
  parse_setting("offset=-2")
  |> should.equal(Ok(Setting("offset", -2)))
}

pub fn empty_value_is_not_a_number_test() {
  parse_setting("retries=")
  |> should.equal(Error(NotANumber("")))
}

pub fn splits_at_first_equals_test() {
  parse_setting("query=a=b")
  |> should.equal(Error(NotANumber("a=b")))
}
