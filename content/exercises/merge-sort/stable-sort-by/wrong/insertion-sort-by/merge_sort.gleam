import gleam/list
import gleam/order.{type Order}

pub type Shipment {
  Shipment(id: String, priority: Int)
}

// 정렬된 목록에 하나씩 끼워 넣는다. 안정적이고 결과도 맞지만 O(n^2)이다.
pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a) {
  list.fold(items, [], fn(sorted, item) { insert(sorted, item, compare) })
}

fn insert(sorted: List(a), item: a, compare: fn(a, a) -> Order) -> List(a) {
  case sorted {
    [] -> [item]
    [first, ..rest] ->
      case compare(item, first) {
        order.Lt -> [item, first, ..rest]
        order.Eq | order.Gt -> [first, ..insert(rest, item, compare)]
      }
  }
}
