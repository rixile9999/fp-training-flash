pub fn merge(left: List(Int), right: List(Int)) -> List(Int) {
  case left, right {
    [], _ -> right
    _, [] -> left
    [x, ..rest], [y, ..] if x <= y -> [x, ..merge(rest, right)]
    _, [y, ..rest] -> [y, ..merge(left, rest)]
  }
}
