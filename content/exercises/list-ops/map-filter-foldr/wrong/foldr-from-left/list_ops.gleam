// 누적값을 먼저 갱신하고 나머지로 넘어가서, 실제로는 앞 원소부터 누적한다(foldl).
pub fn foldr(
  over list: List(a),
  from initial: b,
  with function: fn(b, a) -> b,
) -> b {
  case list {
    [] -> initial
    [first, ..rest] ->
      foldr(over: rest, from: function(initial, first), with: function)
  }
}

pub fn map(list: List(a), function: fn(a) -> b) -> List(b) {
  case list {
    [] -> []
    [first, ..rest] -> [function(first), ..map(rest, function)]
  }
}

pub fn filter(list: List(a), function: fn(a) -> Bool) -> List(a) {
  case list {
    [] -> []
    [first, ..rest] ->
      case function(first) {
        True -> [first, ..filter(rest, function)]
        False -> filter(rest, function)
      }
  }
}
