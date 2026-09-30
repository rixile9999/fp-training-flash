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

pub fn minimum(tree: Tree) -> Result(Int, Nil) {
  case tree {
    Empty -> Error(Nil)
    Node(data, Empty, _) -> Ok(data)
    Node(_, left, _) -> minimum(left)
  }
}
