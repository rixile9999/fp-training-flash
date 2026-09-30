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
  list.map(orders, fn(order) {
    case order.status {
      Pending -> Order(..order, amount: discount(order.amount, percent))
      Shipped | Cancelled -> order
    }
  })
}

fn discount(amount: Int, percent: Int) -> Int {
  amount * { 100 - percent } / 100
}
