import gleam/list
import gleam/string

const stopwords = ["the", "a", "an", "of", "The", "A", "An", "Of"]

pub fn split_words(text: String) -> List(String) {
  text
  |> string.split(" ")
  |> list.filter(fn(word) { word != "" })
}

pub fn remove_stopwords(words: List(String)) -> List(String) {
  list.filter(words, fn(word) { !list.contains(stopwords, word) })
}

pub fn normalize_query(text: String) -> List(String) {
  text
  |> split_words
  |> remove_stopwords
  |> list.map(string.lowercase)
}
