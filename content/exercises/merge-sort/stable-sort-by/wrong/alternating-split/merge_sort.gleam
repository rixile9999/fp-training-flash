import gleam/list
import gleam/order.{type Order}

pub type Shipment {
  Shipment(id: String, priority: Int)
}

pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a) {
  case items {
    [] | [_] -> items
    _ -> {
      let #(odds, evens) = deal(items, [], [])
      merge(sort_by(odds, compare), sort_by(evens, compare), compare)
    }
  }
}

// 원소를 번갈아 두 목록에 나눠 담는다. 길이를 셀 필요는 없지만
// 왼쪽 목록의 원소가 오른쪽 원소보다 원래 앞에 있다는 보장이 사라진다.
fn deal(items: List(a), left: List(a), right: List(a)) -> #(List(a), List(a)) {
  case items {
    [] -> #(list.reverse(left), list.reverse(right))
    [x] -> #(list.reverse([x, ..left]), list.reverse(right))
    [x, y, ..rest] -> deal(rest, [x, ..left], [y, ..right])
  }
}

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
