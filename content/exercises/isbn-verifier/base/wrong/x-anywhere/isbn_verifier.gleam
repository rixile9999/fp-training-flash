import gleam/int
import gleam/list
import gleam/string

pub fn is_valid(isbn: String) -> Bool {
  case parse(isbn) {
    Ok(values) -> checksum(values) % 11 == 0
    Error(Nil) -> False
  }
}

fn parse(isbn: String) -> Result(List(Int), Nil) {
  let chars =
    isbn
    |> string.to_graphemes
    |> list.filter(fn(char) { char != "-" })
  case list.length(chars) {
    10 ->
      chars
      |> list.index_map(fn(char, index) { #(char, index) })
      |> list.try_map(fn(pair) { char_value(pair.0, pair.1) })
    _ -> Error(Nil)
  }
}

fn char_value(char: String, index: Int) -> Result(Int, Nil) {
  case char, index {
    "X", _ -> Ok(10)
    _, _ -> int.parse(char)
  }
}

fn checksum(values: List(Int)) -> Int {
  list.index_fold(values, 0, fn(sum, value, index) {
    sum + value * { 10 - index }
  })
}
