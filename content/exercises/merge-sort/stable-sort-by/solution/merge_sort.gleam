import gleam/list
import gleam/order.{type Order}

pub type Shipment {
  Shipment(id: String, priority: Int)
}

pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a) {
  case items {
    [] | [_] -> items
    _ -> {
      let #(front, back) = list.split(items, list.length(items) / 2)
      merge(sort_by(front, compare), sort_by(back, compare), compare)
    }
  }
}

/// 비교 결과가 같으면 왼쪽(원래 더 앞에 있던) 원소를 먼저 꺼낸다.
fn merge(left: List(a), right: List(a), compare: fn(a, a) -> Order) -> List(a) {
  case left, right {
    [], _ -> right
    _, [] -> left
    [x, ..xs], [y, ..ys] ->
      case compare(x, y) {
        order.Gt -> [y, ..merge(left, ys, compare)]
        order.Lt | order.Eq -> [x, ..merge(xs, right, compare)]
      }
  }
}
