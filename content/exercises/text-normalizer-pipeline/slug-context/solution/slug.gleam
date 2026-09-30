import gleam/list
import gleam/string

const allowed = "abcdefghijklmnopqrstuvwxyz0123456789"

pub fn clean_word(word: String) -> String {
  word
  |> string.lowercase
  |> string.to_graphemes
  |> list.filter(fn(char) { string.contains(allowed, char) })
  |> string.concat
}

pub fn to_words(text: String) -> List(String) {
  text
  |> string.split(" ")
  |> list.map(clean_word)
  |> list.filter(fn(word) { word != "" })
}

pub fn slugify(text: String) -> String {
  text
  |> to_words
  |> string.join("-")
}

pub fn short_slug(text: String, max_words: Int) -> String {
  text
  |> to_words
  |> list.take(max_words)
  |> string.join("-")
}
