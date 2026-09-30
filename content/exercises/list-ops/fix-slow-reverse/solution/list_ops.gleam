pub fn append(first: List(a), second: List(a)) -> List(a) {
  case first {
    [] -> second
    [x, ..rest] -> [x, ..append(rest, second)]
  }
}

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

pub fn reverse(list: List(a)) -> List(a) {
  foldl(over: list, from: [], with: fn(reversed, item) { [item, ..reversed] })
}
