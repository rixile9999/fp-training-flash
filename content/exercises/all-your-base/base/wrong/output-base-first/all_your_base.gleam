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
    _, True -> Error(InvalidBase(output_base))
    True, False -> Error(InvalidBase(input_base))
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

// 낮은 자리부터 구해 누적자 앞에 붙이므로 결과는 높은 자리부터 나온다.
fn to_digits(value: Int, base: Int, acc: List(Int)) -> List(Int) {
  let acc = [value % base, ..acc]
  case value < base {
    True -> acc
    False -> to_digits(value / base, base, acc)
  }
}
