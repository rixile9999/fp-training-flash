pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

pub fn contains(tree: Tree, value: Int) -> Bool {
  case tree {
    Empty -> False
    Node(data, _, _) if value == data -> True
    Node(data, left, _) if value < data -> contains(left, value)
    Node(_, _, right) -> contains(right, value)
  }
}

// 왼쪽 자식까지만 보고 멈춰서, 더 깊은 곳의 최솟값을 놓친다.
pub fn minimum(tree: Tree) -> Result(Int, Nil) {
  case tree {
    Empty -> Error(Nil)
    Node(data, Empty, _) -> Ok(data)
    Node(_, Node(left_data, _, _), _) -> Ok(left_data)
  }
}
