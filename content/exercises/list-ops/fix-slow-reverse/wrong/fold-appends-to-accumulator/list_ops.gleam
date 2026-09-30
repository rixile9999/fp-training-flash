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

// foldl로 바꿨지만 누적값 뒤에 붙여서 순서가 그대로이고, 여전히 O(n^2)이다.
pub fn reverse(list: List(a)) -> List(a) {
  foldl(over: list, from: [], with: fn(reversed, item) {
    append(reversed, [item])
  })
}
