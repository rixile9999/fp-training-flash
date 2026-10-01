import gleam/list
import gleam/result
import gleam/string

pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
  InvalidAreaCode(first: String)
  InvalidExchangeCode(first: String)
}

pub fn check_area_code(number: String) -> Result(String, PhoneError) {
  todo
}

pub fn check_exchange_code(number: String) -> Result(String, PhoneError) {
  todo
}

pub fn clean(input: String) -> Result(String, PhoneError) {
  todo
}

// Below is the cleanup step you built in the base exercise. Use it as is.

pub fn normalize(input: String) -> Result(String, PhoneError) {
  use digits <- result.try(extract_digits(input))
  normalize_length(digits)
}

fn extract_digits(input: String) -> Result(List(String), PhoneError) {
  input
  |> string.to_graphemes
  |> list.filter(fn(char) { !is_separator(char) })
  |> list.try_map(fn(char) {
    case is_digit(char) {
      True -> Ok(char)
      False -> Error(InvalidCharacter(char))
    }
  })
}

fn normalize_length(digits: List(String)) -> Result(String, PhoneError) {
  case list.length(digits), digits {
    n, _ if n < 10 -> Error(TooFewDigits)
    n, _ if n > 11 -> Error(TooManyDigits)
    11, ["1", ..rest] -> Ok(string.concat(rest))
    11, _ -> Error(InvalidCountryCode)
    _, _ -> Ok(string.concat(digits))
  }
}

fn is_separator(char: String) -> Bool {
  case char {
    " " | "(" | ")" | "-" | "." | "+" -> True
    _ -> False
  }
}

fn is_digit(char: String) -> Bool {
  case char {
    "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" -> True
    _ -> False
  }
}
