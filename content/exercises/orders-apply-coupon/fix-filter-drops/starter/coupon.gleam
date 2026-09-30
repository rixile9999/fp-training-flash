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
  orders
  |> list.filter(fn(o) { o.status == Pending })
  |> list.map(fn(o) { Order(..o, amount: o.amount * { 100 - percent } / 100) })
}
