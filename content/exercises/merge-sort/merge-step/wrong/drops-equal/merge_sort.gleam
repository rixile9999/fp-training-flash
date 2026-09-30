// 작을 때와 클 때만 나누고, 같으면 하나만 넣고 양쪽을 모두 넘긴다.
pub fn merge(left: List(Int), right: List(Int)) -> List(Int) {
  case left, right {
    [], _ -> right
    _, [] -> left
    [x, ..xs], [y, ..] if x < y -> [x, ..merge(xs, right)]
    [x, ..], [y, ..ys] if x > y -> [y, ..merge(left, ys)]
    [x, ..xs], [_, ..ys] -> [x, ..merge(xs, ys)]
  }
}
