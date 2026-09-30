import gleam/list

pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

pub fn to_tree(data: List(Int)) -> Tree {
  list.fold(data, Empty, insert)
}

// 이미 있는 값이면 트리를 그대로 돌려줘서 중복이 사라진다.
fn insert(tree: Tree, value: Int) -> Tree {
  case tree {
    Empty -> Node(value, Empty, Empty)
    Node(data, _, _) if value == data -> tree
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
