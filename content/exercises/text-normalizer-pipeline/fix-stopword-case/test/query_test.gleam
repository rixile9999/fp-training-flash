import gleeunit/should
import query.{normalize_query, remove_stopwords, split_words}

pub fn split_words_test() {
  split_words(" red  apple ")
  |> should.equal(["red", "apple"])
}

pub fn remove_stopwords_test() {
  remove_stopwords(["the", "art", "of", "war"])
  |> should.equal(["art", "war"])
}

pub fn normalize_query_lowercase_test() {
  normalize_query("Green Tea")
  |> should.equal(["green", "tea"])
}

pub fn normalize_query_capital_stopword_test() {
  normalize_query("The Art of War")
  |> should.equal(["art", "war"])
}

pub fn normalize_query_all_caps_test() {
  normalize_query("AN APPLE A DAY")
  |> should.equal(["apple", "day"])
}

pub fn normalize_query_only_stopwords_test() {
  normalize_query("THE a An oF")
  |> should.equal([])
}
