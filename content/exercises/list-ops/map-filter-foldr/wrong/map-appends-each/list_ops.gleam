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

// 순서를 지키려고 누적 결과 뒤에 한 원소씩 이어 붙인다.
// 결과는 맞지만 매번 누적 목록 전체를 복사해서 O(n^2)이다.
pub fn map(list: List(a), function: fn(a) -> b) -> List(b) {
  map_loop(list, function, [])
}

fn map_loop(list: List(a), function: fn(a) -> b, acc: List(b)) -> List(b) {
  case list {
    [] -> acc
    [first, ..rest] -> map_loop(rest, function, append(acc, [function(first)]))
  }
}

fn append(first: List(a), second: List(a)) -> List(a) {
  case first {
    [] -> second
    [x, ..rest] -> [x, ..append(rest, second)]
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
