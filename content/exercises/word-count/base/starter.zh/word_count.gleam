import gleam/dict.{type Dict}
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  todo
}

/// 是一个小写英文字母或数字时返回 True。（已经写好的函数）
fn is_word_char(grapheme: String) -> Bool {
  string.contains("abcdefghijklmnopqrstuvwxyz0123456789", grapheme)
}
