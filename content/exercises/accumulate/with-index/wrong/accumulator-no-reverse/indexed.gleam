pub fn accumulate_indexed(list: List(a), fun: fn(a, Int) -> b) -> List(b) {
  go(list, fun, 0, [])
}

fn go(items: List(a), fun: fn(a, Int) -> b, index: Int, acc: List(b)) -> List(b) {
  case items {
    [] -> acc
    [first, ..rest] -> go(rest, fun, index + 1, [fun(first, index), ..acc])
  }
}
