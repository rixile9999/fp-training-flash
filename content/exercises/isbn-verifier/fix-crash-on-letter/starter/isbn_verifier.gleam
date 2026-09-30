import gleam/int
import gleam/list
import gleam/string

pub fn is_valid(isbn: String) -> Bool {
  let chars =
    isbn
    |> string.to_graphemes
    |> list.filter(fn(char) { char != "-" })
  case list.length(chars) == 10 {
    False -> False
    True -> {
      let values = list.index_map(chars, char_value)
      checksum(values) % 11 == 0
    }
  }
}

fn char_value(char: String, index: Int) -> Int {
  case char, index {
    "X", 9 -> 10
    _, _ -> {
      let assert Ok(digit) = int.parse(char)
      digit
    }
  }
}

fn checksum(values: List(Int)) -> Int {
  list.index_fold(values, 0, fn(sum, value, index) {
    sum + value * { 10 - index }
  })
}
