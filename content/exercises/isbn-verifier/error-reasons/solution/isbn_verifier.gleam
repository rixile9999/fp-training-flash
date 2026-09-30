import gleam/int
import gleam/list
import gleam/result
import gleam/string

pub type IsbnError {
  WrongLength(length: Int)
  InvalidCharacter(position: Int, found: String)
  ChecksumMismatch
}

pub fn validate(isbn: String) -> Result(List(Int), IsbnError) {
  let chars =
    isbn
    |> string.to_graphemes
    |> list.filter(fn(char) { char != "-" })
  use chars <- result.try(check_length(chars))
  use values <- result.try(parse_values(chars))
  case checksum(values) % 11 {
    0 -> Ok(values)
    _ -> Error(ChecksumMismatch)
  }
}

fn check_length(chars: List(String)) -> Result(List(String), IsbnError) {
  case list.length(chars) {
    10 -> Ok(chars)
    length -> Error(WrongLength(length))
  }
}

fn parse_values(chars: List(String)) -> Result(List(Int), IsbnError) {
  chars
  |> list.index_map(fn(char, index) { #(char, index) })
  |> list.try_map(fn(pair) {
    let #(char, index) = pair
    char_value(char, index)
    |> result.replace_error(InvalidCharacter(index, char))
  })
}

fn char_value(char: String, index: Int) -> Result(Int, Nil) {
  case char, index {
    "X", 9 -> Ok(10)
    _, _ -> int.parse(char)
  }
}

fn checksum(values: List(Int)) -> Int {
  list.index_fold(values, 0, fn(sum, value, index) {
    sum + value * { 10 - index }
  })
}
