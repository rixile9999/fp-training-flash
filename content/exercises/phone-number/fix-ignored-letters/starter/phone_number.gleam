import gleam/list
import gleam/string

pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}

pub fn clean(input: String) -> Result(String, PhoneError) {
  let digits =
    input
    |> string.to_graphemes
    |> list.filter(is_digit)
  normalize_length(digits)
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

fn is_digit(char: String) -> Bool {
  case char {
    "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" -> True
    _ -> False
  }
}
