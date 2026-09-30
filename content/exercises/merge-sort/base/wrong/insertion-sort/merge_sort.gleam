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

// 정렬된 목록에 원소를 하나씩 끼워 넣는다. 결과는 맞지만 O(n^2)이다.
pub fn sort(items: List(Int)) -> List(Int) {
  list.fold(items, [], insert)
}

fn insert(sorted: List(Int), item: Int) -> List(Int) {
  case sorted {
    [] -> [item]
    [first, ..rest] if item <= first -> [item, first, ..rest]
    [first, ..rest] -> [first, ..insert(rest, item)]
  }
}
