import gleam/list

pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn from_digits(digits: List(Int), base: Int) -> Result(Int, RebaseError) {
  case base < 2 {
    True -> Error(InvalidBase(base))
    False ->
      list.fold(digits, Ok(0), fn(acc, digit) {
        case digit >= 0 && digit < base, acc {
          True, Ok(total) -> Ok(total * base + digit)
          True, Error(error) -> Error(error)
          False, _ -> Error(InvalidDigit(digit))
        }
      })
  }
}
