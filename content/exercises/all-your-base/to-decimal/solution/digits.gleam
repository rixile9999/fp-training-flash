import gleam/list

pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn from_digits(digits: List(Int), base: Int) -> Result(Int, RebaseError) {
  case base < 2 {
    True -> Error(InvalidBase(base))
    False ->
      list.try_fold(digits, 0, fn(total, digit) {
        case digit >= 0 && digit < base {
          True -> Ok(total * base + digit)
          False -> Error(InvalidDigit(digit))
        }
      })
  }
}
