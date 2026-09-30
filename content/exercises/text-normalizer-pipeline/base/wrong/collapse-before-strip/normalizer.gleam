import gleam/list
import gleam/string

const punctuation = [".", ",", "!", "?"]

pub fn strip_punctuation(text: String) -> String {
  text
  |> string.to_graphemes
  |> list.filter(fn(char) { !list.contains(punctuation, char) })
  |> string.concat
}

pub fn collapse_spaces(text: String) -> String {
  text
  |> string.split(" ")
  |> list.filter(fn(piece) { piece != "" })
  |> string.join(" ")
}

pub fn normalize(text: String) -> String {
  text
  |> string.trim
  |> string.lowercase
  |> collapse_spaces
  |> strip_punctuation
}
