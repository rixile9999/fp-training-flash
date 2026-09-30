import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

/// Correct but O(n^2): appends to the end of the accumulator for every order.
pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  go(orders, percent, [])
}

fn go(orders: List(Order), percent: Int, acc: List(Order)) -> List(Order) {
  case orders {
    [] -> acc
    [order, ..rest] -> {
      let updated = case order.status {
        Pending -> Order(..order, amount: order.amount * { 100 - percent } / 100)
        Shipped | Cancelled -> order
      }
      go(rest, percent, list.append(acc, [updated]))
    }
  }
}
