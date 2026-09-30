import gleam/int
import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

pub type Coupon {
  Coupon(percent: Int, min_amount: Int, max_discount: Int)
}

pub fn apply_coupon(orders: List(Order), coupon: Coupon) -> List(Order) {
  list.map(orders, fn(order) {
    case order.status {
      Pending if order.amount > coupon.min_amount -> {
        let discount =
          int.min(order.amount * coupon.percent / 100, coupon.max_discount)
        Order(..order, amount: order.amount - discount)
      }
      _ -> order
    }
  })
}
