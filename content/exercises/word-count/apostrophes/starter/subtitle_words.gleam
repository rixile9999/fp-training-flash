import gleam/dict.{type Dict}
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  todo
}

/// 영문자, 숫자, 작은따옴표가 아닌 글자를 기준으로 나눈 조각. 빈 조각은 없다.
pub fn tokens(text: String) -> List(String) {
  todo
}

/// 조각 앞뒤의 작은따옴표를 모두 없앤다. 가운데 작은따옴표는 남긴다.
pub fn trim_quotes(token: String) -> String {
  todo
}

/// 영문자(대소문자)나 숫자 한 글자이면 True. (이미 완성된 함수)
fn is_word_char(grapheme: String) -> Bool {
  string.contains(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    grapheme,
  )
}
