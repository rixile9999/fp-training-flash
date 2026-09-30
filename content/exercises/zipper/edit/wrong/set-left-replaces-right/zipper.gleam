pub type Tree(a) {
  Leaf
  Node(value: a, left: Tree(a), right: Tree(a))
}

/// 부모로 돌아갈 때 필요한 정보. 어느 쪽으로 내려왔는지, 부모의 값, 반대쪽 자식.
pub type Crumb(a) {
  WentLeft(value: a, right: Tree(a))
  WentRight(value: a, left: Tree(a))
}

/// 초점(focus)이 가리키는 부분 트리와, 루트에서 초점까지 내려온 경로(가까운 부모가 맨 앞).
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

/// 초점 노드의 값을 바꾼다. 초점이 Leaf면 값이 value이고 자식이 없는 노드로 바꾼다.
pub fn set_value(zipper: Zipper(a), value: a) -> Zipper(a) {
  case zipper.focus {
    Leaf -> Zipper(..zipper, focus: Node(value, Leaf, Leaf))
    Node(_, left, right) -> Zipper(..zipper, focus: Node(value, left, right))
  }
}

/// 초점 노드의 왼쪽 자식을 tree로 바꾼다. 초점이 Leaf면 Error(Nil).
pub fn set_left(zipper: Zipper(a), tree: Tree(a)) -> Result(Zipper(a), Nil) {
  case zipper.focus {
    Leaf -> Error(Nil)
    Node(value, left, _) -> Ok(Zipper(..zipper, focus: Node(value, left, tree)))
  }
}

/// 초점 노드의 오른쪽 자식을 tree로 바꾼다. 초점이 Leaf면 Error(Nil).
pub fn set_right(zipper: Zipper(a), tree: Tree(a)) -> Result(Zipper(a), Nil) {
  case zipper.focus {
    Leaf -> Error(Nil)
    Node(value, left, _) -> Ok(Zipper(..zipper, focus: Node(value, left, tree)))
  }
}
