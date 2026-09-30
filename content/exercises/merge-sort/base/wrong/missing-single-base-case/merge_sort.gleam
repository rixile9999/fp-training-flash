import gleam/list

pub fn split(items: List(Int)) -> #(List(Int), List(Int)) {
  list.split(items, list.length(items) / 2)
}

pub fn merge(left: List(Int), right: List(Int)) -> List(Int) {
  case left, right {
    [], _ -> right
    _, [] -> left
    [x, ..rest], [y, ..] if x <= y -> [x, ..merge(rest, right)]
    _, [y, ..rest] -> [y, ..merge(left, rest)]
  }
}

// 빈 목록만 기본 경우로 두어서, 원소 하나짜리 목록을 #([], [x])로 나눈 뒤
// 다시 [x]를 정렬하는 호출이 끝없이 반복된다.
pub fn sort(items: List(Int)) -> List(Int) {
  case items {
    [] -> []
    _ -> {
      let #(front, back) = split(items)
      merge(sort(front), sort(back))
    }
  }
}
