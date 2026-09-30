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

// 나머지를 뒤집은 뒤 첫 원소를 맨 뒤에 이어 붙인다. 결과는 맞지만
// append가 매번 앞 목록 전체를 복사해서 O(n^2)이다.
pub fn reverse(list: List(a)) -> List(a) {
  case list {
    [] -> []
    [first, ..rest] -> append(reverse(rest), [first])
  }
}

fn append(first: List(a), second: List(a)) -> List(a) {
  case first {
    [] -> second
    [x, ..rest] -> [x, ..append(rest, second)]
  }
}
