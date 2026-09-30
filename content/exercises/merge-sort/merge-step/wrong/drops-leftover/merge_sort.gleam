// 한쪽이 비면 끝났다고 보고 빈 목록을 돌려줘서 다른 쪽의 나머지를 잃는다.
pub fn merge(left: List(Int), right: List(Int)) -> List(Int) {
  case left, right {
    [], _ -> right
    _, [] -> []
    [x, ..rest], [y, ..] if x <= y -> [x, ..merge(rest, right)]
    _, [y, ..rest] -> [y, ..merge(left, rest)]
  }
}
