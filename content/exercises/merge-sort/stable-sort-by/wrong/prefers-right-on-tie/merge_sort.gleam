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

// 같을 때 오른쪽 원소를 먼저 꺼내서, 같은 우선순위의 순서가 뒤바뀐다.
fn merge(left: List(a), right: List(a), compare: fn(a, a) -> Order) -> List(a) {
  case left, right {
    [], _ -> right
    _, [] -> left
    [x, ..xs], [y, ..ys] ->
      case compare(x, y) {
        order.Lt -> [x, ..merge(xs, right, compare)]
        order.Gt | order.Eq -> [y, ..merge(left, ys, compare)]
      }
  }
}
