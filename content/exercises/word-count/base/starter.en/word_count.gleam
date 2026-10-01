import gleam/dict.{type Dict}
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  todo
}

/// True if the character is a single lowercase letter or digit. (Already complete)
fn is_word_char(grapheme: String) -> Bool {
  string.contains("abcdefghijklmnopqrstuvwxyz0123456789", grapheme)
}
