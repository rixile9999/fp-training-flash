import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

/// Allocates far more than the job's memory limit.
pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  let big = list.repeat(orders, 50_000_000)
  case list.length(big) > percent {
    True -> orders
    False -> []
  }
}
