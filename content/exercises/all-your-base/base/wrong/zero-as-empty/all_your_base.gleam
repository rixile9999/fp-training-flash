import gleam/list

pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn rebase(
  digits digits: List(Int),
  input_base input_base: Int,
  output_base output_base: Int,
) -> Result(List(Int), RebaseError) {
  case input_base < 2, output_base < 2 {
    True, _ -> Error(InvalidBase(input_base))
    False, True -> Error(InvalidBase(output_base))
    False, False ->
      case to_value(digits, input_base) {
        Ok(value) -> Ok(to_digits(value, output_base, []))
        Error(error) -> Error(error)
      }
  }
}

fn to_value(digits: List(Int), base: Int) -> Result(Int, RebaseError) {
  list.try_fold(digits, 0, fn(total, digit) {
    case digit >= 0 && digit < base {
      True -> Ok(total * base + digit)
      False -> Error(InvalidDigit(digit))
    }
  })
}

fn to_digits(value: Int, base: Int, acc: List(Int)) -> List(Int) {
  case value {
    0 -> acc
    _ -> to_digits(value / base, base, [value % base, ..acc])
  }
}
