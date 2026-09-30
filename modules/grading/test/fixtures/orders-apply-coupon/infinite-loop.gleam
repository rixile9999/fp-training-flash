pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  spin(orders, percent)
}

fn spin(orders: List(Order), percent: Int) -> List(Order) {
  spin(orders, percent)
}
