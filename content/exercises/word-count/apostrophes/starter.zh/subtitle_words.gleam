import gleam/dict.{type Dict}
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  todo
}

/// 以不是英文字母、数字或单引号的字符为界拆分出的片段。不含空片段。
pub fn tokens(text: String) -> List(String) {
  todo
}

/// 去掉片段首尾的所有单引号。中间的单引号保留。
pub fn trim_quotes(token: String) -> String {
  todo
}

/// 是一个英文字母（大小写均可）或数字时返回 True。（已经写好的函数）
fn is_word_char(grapheme: String) -> Bool {
  string.contains(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    grapheme,
  )
}
