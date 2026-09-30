// 나머지를 먼저 접은 뒤 첫 원소를 합쳐서, 실제로는 뒤 원소부터 누적한다.
pub fn foldl(
  over list: List(a),
  from initial: b,
  with function: fn(b, a) -> b,
) -> b {
  case list {
    [] -> initial
    [first, ..rest] ->
      function(foldl(over: rest, from: initial, with: function), first)
  }
}

pub fn length(list: List(a)) -> Int {
  foldl(over: list, from: 0, with: fn(count, _) { count + 1 })
}

pub fn reverse(list: List(a)) -> List(a) {
  reverse_loop(list, [])
}

fn reverse_loop(list: List(a), acc: List(a)) -> List(a) {
  case list {
    [] -> acc
    [first, ..rest] -> reverse_loop(rest, [first, ..acc])
  }
}
