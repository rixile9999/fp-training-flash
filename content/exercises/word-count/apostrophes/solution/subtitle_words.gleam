import gleam/dict.{type Dict}
import gleam/list
import gleam/option
import gleam/string

pub fn count_words(input: String) -> Dict(String, Int) {
  input
  |> string.lowercase
  |> tokens
  |> list.map(trim_quotes)
  |> list.filter(fn(word) { word != "" })
  |> list.fold(dict.new(), increment)
}

/// 영문자, 숫자, 작은따옴표가 아닌 글자를 기준으로 나눈 조각. 빈 조각은 없다.
pub fn tokens(text: String) -> List(String) {
  text
  |> string.to_graphemes
  |> list.map(fn(g) {
    case is_word_char(g) || g == "'" {
      True -> g
      False -> " "
    }
  })
  |> string.concat
  |> string.split(" ")
  |> list.filter(fn(token) { token != "" })
}

/// 조각 앞뒤의 작은따옴표를 모두 없앤다. 가운데 작은따옴표는 남긴다.
pub fn trim_quotes(token: String) -> String {
  token
  |> string.to_graphemes
  |> list.drop_while(fn(g) { g == "'" })
  |> list.reverse
  |> list.drop_while(fn(g) { g == "'" })
  |> list.reverse
  |> string.concat
}

fn increment(counts: Dict(String, Int), word: String) -> Dict(String, Int) {
  dict.upsert(counts, word, fn(previous) { option.unwrap(previous, 0) + 1 })
}

/// 영문자(대소문자)나 숫자 한 글자이면 True. (이미 완성된 함수)
fn is_word_char(grapheme: String) -> Bool {
  string.contains(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    grapheme,
  )
}
