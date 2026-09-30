import gleam/dict
import gleeunit/should
import word_count.{count_words}

pub fn one_word_test() {
  count_words("word")
  |> should.equal(dict.from_list([#("word", 1)]))
}

pub fn repeated_words_test() {
  count_words("one fish two fish red fish blue fish")
  |> should.equal(
    dict.from_list([
      #("one", 1),
      #("fish", 4),
      #("two", 1),
      #("red", 1),
      #("blue", 1),
    ]),
  )
}

pub fn ignores_case_test() {
  count_words("go Go GO Stop stop")
  |> should.equal(dict.from_list([#("go", 3), #("stop", 2)]))
}

pub fn punctuation_separates_words_test() {
  count_words("car: carpet as java: javascript!!&@$%^&")
  |> should.equal(
    dict.from_list([
      #("car", 1),
      #("carpet", 1),
      #("as", 1),
      #("java", 1),
      #("javascript", 1),
    ]),
  )
}

pub fn cramped_list_test() {
  count_words("one,two,three")
  |> should.equal(dict.from_list([#("one", 1), #("two", 1), #("three", 1)]))
}

pub fn repeated_whitespace_is_not_a_word_test() {
  count_words(" multiple   spaces\n\tand tabs ")
  |> should.equal(
    dict.from_list([#("multiple", 1), #("spaces", 1), #("and", 1), #("tabs", 1)]),
  )
}

pub fn numbers_are_words_test() {
  count_words("testing, 1, 2 testing")
  |> should.equal(dict.from_list([#("testing", 2), #("1", 1), #("2", 1)]))
}

pub fn empty_input_test() {
  count_words("")
  |> should.equal(dict.new())
}
