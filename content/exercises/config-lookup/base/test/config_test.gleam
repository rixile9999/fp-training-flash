import config.{MissingKey, NotAnInt, OutOfRange, get_int, get_port}
import gleam/dict
import gleeunit/should

pub fn get_int_reads_number_test() {
  dict.from_list([#("timeout", "30")])
  |> get_int("timeout")
  |> should.equal(Ok(30))
}

pub fn get_int_missing_key_test() {
  dict.from_list([#("timeout", "30")])
  |> get_int("retries")
  |> should.equal(Error(MissingKey("retries")))
}

pub fn get_port_reads_port_test() {
  dict.from_list([#("host", "localhost"), #("port", "8080")])
  |> get_port
  |> should.equal(Ok(8080))
}

pub fn get_int_not_a_number_test() {
  dict.from_list([#("timeout", "30s")])
  |> get_int("timeout")
  |> should.equal(Error(NotAnInt("timeout", "30s")))
}

pub fn get_port_keeps_parse_error_test() {
  dict.from_list([#("port", "http")])
  |> get_port
  |> should.equal(Error(NotAnInt("port", "http")))
}

pub fn get_port_too_large_test() {
  dict.from_list([#("port", "70000")])
  |> get_port
  |> should.equal(Error(OutOfRange("port", 70_000)))
}

pub fn get_port_zero_test() {
  dict.from_list([#("port", "0")])
  |> get_port
  |> should.equal(Error(OutOfRange("port", 0)))
}

pub fn get_port_upper_bound_test() {
  dict.from_list([#("port", "65535")])
  |> get_port
  |> should.equal(Ok(65_535))
}
