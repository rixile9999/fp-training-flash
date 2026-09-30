import gleam/dict
import gleeunit/should
import word_tally.{increment, tally}

pub fn counts_repeated_word_test() {
  tally("fish one fish two fish")
  |> should.equal(dict.from_list([#("fish", 3), #("one", 1), #("two", 1)]))
}

pub fn increment_adds_one_to_existing_test() {
  increment(dict.from_list([#("go", 2)]), "go")
  |> should.equal(dict.from_list([#("go", 3)]))
}

pub fn increment_new_word_starts_at_one_test() {
  increment(dict.from_list([#("go", 2)]), "stop")
  |> should.equal(dict.from_list([#("go", 2), #("stop", 1)]))
}

pub fn case_insensitive_counts_add_up_test() {
  tally("Stop stop STOP")
  |> should.equal(dict.from_list([#("stop", 3)]))
}

pub fn each_word_once_test() {
  tally("one of each")
  |> should.equal(dict.from_list([#("one", 1), #("of", 1), #("each", 1)]))
}

pub fn empty_input_test() {
  tally("")
  |> should.equal(dict.new())
}
