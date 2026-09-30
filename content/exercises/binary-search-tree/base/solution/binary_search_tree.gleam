import gleam/list

pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

pub fn to_tree(data: List(Int)) -> Tree {
  list.fold(data, Empty, insert)
}

fn insert(tree: Tree, value: Int) -> Tree {
  case tree {
    Empty -> Node(value, Empty, Empty)
    Node(data, left, right) if value <= data ->
      Node(data, insert(left, value), right)
    Node(data, left, right) -> Node(data, left, insert(right, value))
  }
}

pub fn sorted_data(data: List(Int)) -> List(Int) {
  data
  |> to_tree
  |> in_order([])
}

/// 오른쪽부터 펼쳐 누적자 앞에 붙이므로 이어 붙이기 없이 오름차순 목록이 된다.
fn in_order(tree: Tree, acc: List(Int)) -> List(Int) {
  case tree {
    Empty -> acc
    Node(data, left, right) -> in_order(left, [data, ..in_order(right, acc)])
  }
}
