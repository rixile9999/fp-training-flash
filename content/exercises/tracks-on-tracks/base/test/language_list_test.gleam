import gleeunit/should
import language_list.{add_language, count_languages, exciting_list, reverse_list}

pub fn add_language_prepends_test() {
  add_language(["OCaml", "Elixir"], "Scheme")
  |> should.equal(["Scheme", "OCaml", "Elixir"])
}

pub fn count_languages_test() {
  count_languages(["jq", "Elm", "Rust", "Kotlin"])
  |> should.equal(4)
}

pub fn reverse_list_test() {
  reverse_list(["Python", "Julia", "Idris", "COBOL"])
  |> should.equal(["COBOL", "Idris", "Julia", "Python"])
}

pub fn gleam_first_is_exciting_test() {
  exciting_list(["Gleam", "Clojure"])
  |> should.be_true
}

pub fn gleam_second_of_two_is_exciting_test() {
  exciting_list(["Lua", "Gleam"])
  |> should.be_true
}

pub fn gleam_third_is_not_exciting_test() {
  exciting_list(["Julia", "Assembly", "Gleam"])
  |> should.be_false
}

pub fn gleam_second_of_four_is_not_exciting_test() {
  exciting_list(["Elm", "Gleam", "C#", "Scheme"])
  |> should.be_false
}

pub fn gleam_first_of_four_is_exciting_test() {
  exciting_list(["Gleam", "C", "C++", "C#"])
  |> should.be_true
}
