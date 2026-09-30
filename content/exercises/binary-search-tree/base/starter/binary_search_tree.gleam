import gleam/list

pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

pub fn to_tree(data: List(Int)) -> Tree {
  todo
}

pub fn sorted_data(data: List(Int)) -> List(Int) {
  todo
}
