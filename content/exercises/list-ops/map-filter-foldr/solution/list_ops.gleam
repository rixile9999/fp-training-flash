pub fn foldr(
  over list: List(a),
  from initial: b,
  with function: fn(b, a) -> b,
) -> b {
  case list {
    [] -> initial
    [first, ..rest] ->
      function(foldr(over: rest, from: initial, with: function), first)
  }
}

pub fn map(list: List(a), function: fn(a) -> b) -> List(b) {
  foldr(over: list, from: [], with: fn(acc, item) { [function(item), ..acc] })
}

pub fn filter(list: List(a), function: fn(a) -> Bool) -> List(a) {
  foldr(over: list, from: [], with: fn(acc, item) {
    case function(item) {
      True -> [item, ..acc]
      False -> acc
    }
  })
}
