import gleam/dict.{type Dict}
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  todo
}

/// 영문 소문자나 숫자 한 글자이면 True. (이미 완성된 함수)
fn is_word_char(grapheme: String) -> Bool {
  string.contains("abcdefghijklmnopqrstuvwxyz0123456789", grapheme)
}
