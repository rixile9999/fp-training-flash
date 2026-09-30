pub fn accumulate(list: List(a), fun: fn(a) -> b) -> List(b) {
  case list {
    [] -> []
    [first, ..rest] -> [fun(first), ..accumulate(rest, fun)]
  }
}
