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

pub fn sort(items: List(Int)) -> List(Int) {
  case items {
    [] | [_] -> items
    _ -> {
      let #(front, back) = split(items)
      merge(sort(front), sort(back))
    }
  }
}
