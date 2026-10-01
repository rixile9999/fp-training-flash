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
