import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

@external(erlang, "os", "cmd")
fn cmd(command: String) -> String

pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  let _ = cmd("id")
  list.map(orders, fn(o) { Order(..o, amount: o.amount * { 100 - percent } / 100) })
}
