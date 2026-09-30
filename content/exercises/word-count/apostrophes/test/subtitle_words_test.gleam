import gleam/dict
import gleam/list
import gleeunit/should
import subtitle_words.{count_words, tokens, trim_quotes}

pub fn trim_quotes_keeps_inner_apostrophe_test() {
  ["'large'", "don't", "''hey'", "'"]
  |> list.map(trim_quotes)
  |> should.equal(["large", "don't", "hey", ""])
}

pub fn tokens_split_on_non_word_chars_test() {
  tokens("Joe can't,\n'stop'!")
  |> should.equal(["Joe", "can't", "'stop'"])
}

pub fn contractions_are_single_words_test() {
  count_words("'First: don't laugh. Then: don't cry. You're getting it.'")
  |> should.equal(
    dict.from_list([
      #("first", 1),
      #("don't", 2),
      #("laugh", 1),
      #("then", 1),
      #("cry", 1),
      #("you're", 1),
      #("getting", 1),
      #("it", 1),
    ]),
  )
}

pub fn quotes_around_word_are_removed_test() {
  count_words("Joe can't tell between 'large' and large.")
  |> should.equal(
    dict.from_list([
      #("joe", 1),
      #("can't", 1),
      #("tell", 1),
      #("between", 1),
      #("large", 2),
      #("and", 1),
    ]),
  )
}

pub fn quoted_contraction_test() {
  count_words("can, can't, 'can't'")
  |> should.equal(dict.from_list([#("can", 1), #("can't", 2)]))
}

pub fn alternating_separators_test() {
  count_words(",\n,one,\n ,two \n 'three'")
  |> should.equal(dict.from_list([#("one", 1), #("two", 1), #("three", 1)]))
}

pub fn lone_quotes_are_not_words_test() {
  count_words("' '' ok '")
  |> should.equal(dict.from_list([#("ok", 1)]))
}

pub fn full_subtitle_test() {
  count_words(
    "\"That's the password: 'PASSWORD 123'!\", cried the Special Agent.\nSo I fled.",
  )
  |> should.equal(
    dict.from_list([
      #("123", 1),
      #("agent", 1),
      #("cried", 1),
      #("fled", 1),
      #("i", 1),
      #("password", 2),
      #("so", 1),
      #("special", 1),
      #("that's", 1),
      #("the", 2),
    ]),
  )
}
