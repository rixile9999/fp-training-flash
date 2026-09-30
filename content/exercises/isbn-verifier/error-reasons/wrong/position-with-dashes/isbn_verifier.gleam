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
  let indexed =
    isbn
    |> string.to_graphemes
    |> list.index_map(fn(char, index) { #(char, index) })
    |> list.filter(fn(pair) { pair.0 != "-" })
  use indexed <- result.try(check_length(indexed))
  use values <- result.try(parse_values(indexed))
  case checksum(values) % 11 {
    0 -> Ok(values)
    _ -> Error(ChecksumMismatch)
  }
}

fn check_length(
  indexed: List(#(String, Int)),
) -> Result(List(#(String, Int)), IsbnError) {
  case list.length(indexed) {
    10 -> Ok(indexed)
    length -> Error(WrongLength(length))
  }
}

fn parse_values(indexed: List(#(String, Int))) -> Result(List(Int), IsbnError) {
  indexed
  |> list.index_map(fn(pair, digit_index) {
    let #(char, original_index) = pair
    char_value(char, digit_index)
    |> result.replace_error(InvalidCharacter(original_index, char))
  })
  |> result.all
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
