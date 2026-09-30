import config.{NotAnInt, get_int_or, get_optional_int}
import gleam/dict
import gleam/option.{None, Some}
import gleeunit/should

pub fn get_int_or_reads_value_test() {
  dict.from_list([#("workers", "4")])
  |> get_int_or("workers", 1)
  |> should.equal(Ok(4))
}

pub fn get_int_or_uses_default_when_missing_test() {
  dict.from_list([#("host", "localhost")])
  |> get_int_or("workers", 1)
  |> should.equal(Ok(1))
}

pub fn get_optional_int_missing_is_none_test() {
  dict.from_list([#("host", "localhost")])
  |> get_optional_int("max_connections")
  |> should.equal(Ok(None))
}

pub fn get_optional_int_present_is_some_test() {
  dict.from_list([#("max_connections", "100")])
  |> get_optional_int("max_connections")
  |> should.equal(Ok(Some(100)))
}

pub fn get_int_or_invalid_is_error_test() {
  dict.from_list([#("workers", "many")])
  |> get_int_or("workers", 1)
  |> should.equal(Error(NotAnInt("workers", "many")))
}

pub fn get_optional_int_invalid_is_error_test() {
  dict.from_list([#("max_connections", "unlimited")])
  |> get_optional_int("max_connections")
  |> should.equal(Error(NotAnInt("max_connections", "unlimited")))
}

pub fn empty_value_is_not_missing_test() {
  dict.from_list([#("workers", "")])
  |> get_int_or("workers", 1)
  |> should.equal(Error(NotAnInt("workers", "")))
}
