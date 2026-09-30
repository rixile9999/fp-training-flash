import gleam/list

pub fn partition(items: List(t), predicate: fn(t) -> Bool) -> #(List(t), List(t)) {
  go(items, predicate, [], [])
}

fn go(
  items: List(t),
  predicate: fn(t) -> Bool,
  kept: List(t),
  rejected: List(t),
) -> #(List(t), List(t)) {
  case items {
    [] -> #(list.reverse(rejected), list.reverse(kept))
    [first, ..rest] ->
      case predicate(first) {
        True -> go(rest, predicate, [first, ..kept], rejected)
        False -> go(rest, predicate, kept, [first, ..rejected])
      }
  }
}
