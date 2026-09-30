import gleam/list
import gleam/order.{type Order}

pub type Shipment {
  Shipment(id: String, priority: Int)
}

pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a) {
  todo
}
