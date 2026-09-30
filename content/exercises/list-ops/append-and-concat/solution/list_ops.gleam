pub fn append(first first: List(a), second second: List(a)) -> List(a) {
  case first {
    [] -> second
    [x, ..rest] -> [x, ..append(first: rest, second: second)]
  }
}

/// 뒤에서부터 합치므로 각 안쪽 목록을 정확히 한 번씩만 복사한다.
pub fn concat(lists: List(List(a))) -> List(a) {
  case lists {
    [] -> []
    [list, ..rest] -> append(first: list, second: concat(rest))
  }
}
