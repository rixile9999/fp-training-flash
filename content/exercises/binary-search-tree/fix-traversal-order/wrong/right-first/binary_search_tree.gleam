import gleam/list

pub type Tree {
  Empty
  Node(data: Int, left: Tree, right: Tree)
}

pub fn to_tree(data: List(Int)) -> Tree {
  list.fold(data, Empty, insert)
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
  |> walk
}

// 오른쪽부터 방문해서 내림차순이 된다.
fn walk(tree: Tree) -> List(Int) {
  case tree {
    Empty -> []
    Node(data, left, right) -> list.flatten([walk(right), [data], walk(left)])
  }
}
