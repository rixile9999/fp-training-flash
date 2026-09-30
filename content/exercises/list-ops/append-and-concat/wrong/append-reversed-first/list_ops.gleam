// first의 원소를 하나씩 second 앞으로 옮겨서, first 부분이 뒤집힌다.
pub fn append(first first: List(a), second second: List(a)) -> List(a) {
  case first {
    [] -> second
    [x, ..rest] -> append(first: rest, second: [x, ..second])
  }
}

pub fn concat(lists: List(List(a))) -> List(a) {
  case lists {
    [] -> []
    [list, ..rest] -> append(first: list, second: concat(rest))
  }
}
