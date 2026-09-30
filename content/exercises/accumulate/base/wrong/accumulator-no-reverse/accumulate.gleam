pub fn accumulate(list: List(a), fun: fn(a) -> b) -> List(b) {
  go(list, fun, [])
}

fn go(items: List(a), fun: fn(a) -> b, acc: List(b)) -> List(b) {
  case items {
    [] -> acc
    [first, ..rest] -> go(rest, fun, [fun(first), ..acc])
  }
}
