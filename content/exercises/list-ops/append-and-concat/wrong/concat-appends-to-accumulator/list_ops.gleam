pub fn append(first first: List(a), second second: List(a)) -> List(a) {
  case first {
    [] -> second
    [x, ..rest] -> [x, ..append(first: rest, second: second)]
  }
}

// 앞에서부터 누적하면서 누적 결과 뒤에 붙인다. 결과는 맞지만
// 매번 지금까지 합친 목록 전체를 복사해서 O(전체 원소 수 x 목록 수)이다.
pub fn concat(lists: List(List(a))) -> List(a) {
  concat_loop(lists, [])
}

fn concat_loop(lists: List(List(a)), acc: List(a)) -> List(a) {
  case lists {
    [] -> acc
    [list, ..rest] -> concat_loop(rest, append(first: acc, second: list))
  }
}
