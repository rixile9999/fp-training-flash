pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

// 값을 비교하지 않고 양쪽 서브트리를 모두 뒤진다. 결과는 맞지만
// 없는 값을 찾을 때마다 트리 전체(O(n))를 훑는다.
pub fn contains(tree: Tree, value: Int) -> Bool {
  case tree {
    Empty -> False
    Node(data, left, right) ->
      data == value || contains(left, value) || contains(right, value)
  }
}

pub fn minimum(tree: Tree) -> Result(Int, Nil) {
  case tree {
    Empty -> Error(Nil)
    Node(data, Empty, _) -> Ok(data)
    Node(_, left, _) -> minimum(left)
  }
}
