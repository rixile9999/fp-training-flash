import gleam/list

pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

// fold_right는 목록의 마지막 원소부터 넣어서 루트가 달라진다.
pub fn to_tree(data: List(Int)) -> Tree {
  list.fold_right(data, Empty, insert)
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

fn in_order(tree: Tree, acc: List(Int)) -> List(Int) {
  case tree {
    Empty -> acc
    Node(data, left, right) -> in_order(left, [data, ..in_order(right, acc)])
  }
}
