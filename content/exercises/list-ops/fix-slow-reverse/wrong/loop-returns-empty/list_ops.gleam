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
  reverse_loop(list, [])
}

// 누적자로 모아 놓고 끝에서 누적자 대신 빈 목록을 돌려준다.
fn reverse_loop(list: List(a), acc: List(a)) -> List(a) {
  case list {
    [] -> []
    [first, ..rest] -> reverse_loop(rest, [first, ..acc])
  }
}
