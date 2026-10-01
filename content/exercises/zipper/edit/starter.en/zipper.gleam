pub type Tree(a) {
  Leaf
  Node(value: a, left: Tree(a), right: Tree(a))
}

/// What you need to go back to the parent: which way you came down, the parent's value, and the other child.
pub type Crumb(a) {
  WentLeft(value: a, right: Tree(a))
  WentRight(value: a, left: Tree(a))
}

/// The subtree the focus points to, and the path taken from the root down to the focus (nearest parent first).
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

/// Changes the value of the focus node. If the focus is a Leaf, replaces it with a node whose value is value and that has no children.
pub fn set_value(zipper: Zipper(a), value: a) -> Zipper(a) {
  todo
}

/// Replaces the left child of the focus node with tree. Error(Nil) if the focus is a Leaf.
pub fn set_left(zipper: Zipper(a), tree: Tree(a)) -> Result(Zipper(a), Nil) {
  todo
}

/// Replaces the right child of the focus node with tree. Error(Nil) if the focus is a Leaf.
pub fn set_right(zipper: Zipper(a), tree: Tree(a)) -> Result(Zipper(a), Nil) {
  todo
}
