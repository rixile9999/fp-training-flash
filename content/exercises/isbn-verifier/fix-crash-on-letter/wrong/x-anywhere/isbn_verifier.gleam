import gleam/int
import gleam/list
import gleam/result
import gleam/string

pub fn is_valid(isbn: String) -> Bool {
  let chars =
    isbn
    |> string.to_graphemes
    |> list.filter(fn(char) { char != "-" })
  case list.length(chars) == 10 {
    False -> False
    True ->
      case chars |> list.index_map(char_value) |> result.all {
        Ok(values) -> checksum(values) % 11 == 0
        Error(Nil) -> False
      }
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
