import exciting.{exciting_list}
import gleeunit/should

pub fn single_gleam_is_exciting_test() {
  exciting_list(["Gleam"])
  |> should.be_true
}

pub fn gleam_second_of_three_is_exciting_test() {
  exciting_list(["Java", "Gleam", "C#"])
  |> should.be_true
}

pub fn gleam_second_of_four_is_not_exciting_test() {
  exciting_list(["Elm", "Gleam", "C#", "Scheme"])
  |> should.be_false
}

pub fn empty_list_is_not_exciting_test() {
  exciting_list([])
  |> should.be_false
}

pub fn single_other_language_is_not_exciting_test() {
  exciting_list(["Go"])
  |> should.be_false
}

pub fn gleam_first_of_five_is_exciting_test() {
  exciting_list(["Gleam", "Go", "Rust", "Elm", "Lua"])
  |> should.be_true
}
