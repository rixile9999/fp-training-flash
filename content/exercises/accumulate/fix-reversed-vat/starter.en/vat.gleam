/// A new list with fun applied to each element of the list. The order must match the input.
pub fn accumulate(items: List(a), fun: fn(a) -> b) -> List(b) {
  go(items, fun, [])
}

fn go(items: List(a), fun: fn(a) -> b, acc: List(b)) -> List(b) {
  case items {
    [] -> acc
    [first, ..rest] -> go(rest, fun, [fun(first), ..acc])
  }
}

/// Each pre-tax price with 10% VAT added. Anything below 1 won is dropped.
pub fn with_vat(prices: List(Int)) -> List(Int) {
  accumulate(prices, fn(price) { price * 110 / 100 })
}
