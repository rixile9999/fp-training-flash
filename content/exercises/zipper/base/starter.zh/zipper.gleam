pub type Tree(a) {
  Leaf
  Node(value: a, left: Tree(a), right: Tree(a))
}

/// 回到父节点时需要的信息：从哪一侧下来的、父节点的值、另一侧的子节点。
pub type Crumb(a) {
  WentLeft(value: a, right: Tree(a))
  WentRight(value: a, left: Tree(a))
}

/// 焦点（focus）所指的子树，以及从根下到焦点的路径（最近的父节点在最前面）。
pub opaque type Zipper(a) {
  Zipper(focus: Tree(a), crumbs: List(Crumb(a)))
}

pub fn to_zipper(tree: Tree(a)) -> Zipper(a) {
  Zipper(focus: tree, crumbs: [])
}

pub fn value(zipper: Zipper(a)) -> Result(a, Nil) {
  case zipper.focus {
    Leaf -> Error(Nil)
    Node(value:, ..) -> Ok(value)
  }
}

pub fn left(zipper: Zipper(a)) -> Result(Zipper(a), Nil) {
  todo
}

pub fn right(zipper: Zipper(a)) -> Result(Zipper(a), Nil) {
  todo
}

pub fn up(zipper: Zipper(a)) -> Result(Zipper(a), Nil) {
  todo
}

pub fn to_tree(zipper: Zipper(a)) -> Tree(a) {
  todo
}
