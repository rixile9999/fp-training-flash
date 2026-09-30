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
    False, False -> {
      let value =
        digits
        |> list.map(fn(digit) {
          case digit >= 0 && digit < input_base {
            True -> digit
            False -> 0
          }
        })
        |> list.fold(0, fn(total, digit) { total * input_base + digit })
      Ok(to_digits(value, output_base, []))
    }
  }
}

fn to_digits(value: Int, base: Int, acc: List(Int)) -> List(Int) {
  let acc = [value % base, ..acc]
  case value < base {
    True -> acc
    False -> to_digits(value / base, base, acc)
  }
}
