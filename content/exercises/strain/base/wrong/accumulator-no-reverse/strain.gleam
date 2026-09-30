pub fn keep(items: List(t), predicate: fn(t) -> Bool) -> List(t) {
  go(items, predicate, [])
}

pub fn discard(items: List(t), predicate: fn(t) -> Bool) -> List(t) {
  keep(items, fn(item) { !predicate(item) })
}

fn go(items: List(t), predicate: fn(t) -> Bool, acc: List(t)) -> List(t) {
  case items {
    [] -> acc
    [first, ..rest] ->
      case predicate(first) {
        True -> go(rest, predicate, [first, ..acc])
        False -> go(rest, predicate, acc)
      }
  }
}
