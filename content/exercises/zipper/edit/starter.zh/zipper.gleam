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
  case zipper.focus {
    Leaf -> Error(Nil)
    Node(value, left, right) ->
      Ok(Zipper(focus: left, crumbs: [WentLeft(value, right), ..zipper.crumbs]))
  }
}

pub fn right(zipper: Zipper(a)) -> Result(Zipper(a), Nil) {
  case zipper.focus {
    Leaf -> Error(Nil)
    Node(value, left, right) ->
      Ok(Zipper(focus: right, crumbs: [WentRight(value, left), ..zipper.crumbs]))
  }
}

pub fn up(zipper: Zipper(a)) -> Result(Zipper(a), Nil) {
  case zipper.crumbs {
    [] -> Error(Nil)
    [WentLeft(value, right), ..crumbs] ->
      Ok(Zipper(focus: Node(value, zipper.focus, right), crumbs: crumbs))
    [WentRight(value, left), ..crumbs] ->
      Ok(Zipper(focus: Node(value, left, zipper.focus), crumbs: crumbs))
  }
}

pub fn to_tree(zipper: Zipper(a)) -> Tree(a) {
  case up(zipper) {
    Ok(parent) -> to_tree(parent)
    Error(Nil) -> zipper.focus
  }
}

/// 修改焦点节点的值。焦点是 Leaf 时，换成值为 value、没有子节点的节点。
pub fn set_value(zipper: Zipper(a), value: a) -> Zipper(a) {
  todo
}

/// 把焦点节点的左子节点换成 tree。焦点是 Leaf 时返回 Error(Nil)。
pub fn set_left(zipper: Zipper(a), tree: Tree(a)) -> Result(Zipper(a), Nil) {
  todo
}

/// 把焦点节点的右子节点换成 tree。焦点是 Leaf 时返回 Error(Nil)。
pub fn set_right(zipper: Zipper(a), tree: Tree(a)) -> Result(Zipper(a), Nil) {
  todo
}
