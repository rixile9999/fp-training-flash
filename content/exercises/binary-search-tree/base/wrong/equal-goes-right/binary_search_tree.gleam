import gleam/list

pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

pub fn to_tree(data: List(Int)) -> Tree {
  list.fold(data, Empty, insert)
}

// 같은 값을 "크다" 쪽으로 보내서 오른쪽에 넣는다.
fn insert(tree: Tree, value: Int) -> Tree {
  case tree {
    Empty -> Node(value, Empty, Empty)
    Node(data, left, right) if value < data ->
      Node(data, insert(left, value), right)
    Node(data, left, right) -> Node(data, left, insert(right, value))
  }
}

pub fn sorted_data(data: List(Int)) -> List(Int) {
  data
  |> to_tree
  |> in_order([])
}

fn in_order(tree: Tree, acc: List(Int)) -> List(Int) {
  case tree {
    Empty -> acc
    Node(data, left, right) -> in_order(left, [data, ..in_order(right, acc)])
  }
}
