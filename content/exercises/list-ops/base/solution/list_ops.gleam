pub fn foldl(
  over list: List(a),
  from initial: b,
  with function: fn(b, a) -> b,
) -> b {
  case list {
    [] -> initial
    [first, ..rest] ->
      foldl(over: rest, from: function(initial, first), with: function)
  }
}

pub fn length(list: List(a)) -> Int {
  foldl(over: list, from: 0, with: fn(count, _) { count + 1 })
}

pub fn reverse(list: List(a)) -> List(a) {
  foldl(over: list, from: [], with: fn(reversed, item) { [item, ..reversed] })
}
