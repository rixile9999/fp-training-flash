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

// 앞에서부터 누적하며 앞에 붙이고 뒤집지 않아서 순서가 거꾸로 된다.
pub fn map(list: List(a), function: fn(a) -> b) -> List(b) {
  map_loop(list, function, [])
}

fn map_loop(list: List(a), function: fn(a) -> b, acc: List(b)) -> List(b) {
  case list {
    [] -> acc
    [first, ..rest] -> map_loop(rest, function, [function(first), ..acc])
  }
}

pub fn filter(list: List(a), function: fn(a) -> Bool) -> List(a) {
  foldr(over: list, from: [], with: fn(acc, item) {
    case function(item) {
      True -> [item, ..acc]
      False -> acc
    }
  })
}
