import gleam/list
import gleam/result

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
      to_value(digits, input_base)
      |> result.map(to_digits(_, output_base, []))
  }
}

fn to_value(digits: List(Int), base: Int) -> Result(Int, RebaseError) {
  list.fold(digits, Ok(0), fn(acc, digit) {
    case digit >= 0 && digit < base, acc {
      True, Ok(total) -> Ok(total * base + digit)
      True, Error(error) -> Error(error)
      False, _ -> Error(InvalidDigit(digit))
    }
  })
}

fn to_digits(value: Int, base: Int, acc: List(Int)) -> List(Int) {
  let acc = [value % base, ..acc]
  case value < base {
    True -> acc
    False -> to_digits(value / base, base, acc)
  }
}
