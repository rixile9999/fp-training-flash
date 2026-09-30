import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

// filter만 지워서 모든 주문이 할인된다.
pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  orders
  |> list.map(fn(o) { Order(..o, amount: o.amount * { 100 - percent } / 100) })
}
