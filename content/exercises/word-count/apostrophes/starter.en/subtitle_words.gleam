import gleam/dict.{type Dict}
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  todo
}

/// Pieces split on characters that are not letters, digits or apostrophes. There are no empty pieces.
pub fn tokens(text: String) -> List(String) {
  todo
}

/// Removes all apostrophes from both ends of a piece. Apostrophes in the middle stay.
pub fn trim_quotes(token: String) -> String {
  todo
}

/// True if the character is a single letter (either case) or digit. (Already complete)
fn is_word_char(grapheme: String) -> Bool {
  string.contains(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    grapheme,
  )
}
