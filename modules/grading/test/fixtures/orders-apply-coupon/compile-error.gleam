import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  list.map(orders, fn(o) { Order(..o, amount: o.amount * percent / 100.0) })
}
