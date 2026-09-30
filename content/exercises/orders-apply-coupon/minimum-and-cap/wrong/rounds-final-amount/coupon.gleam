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

// 할인 후 금액을 먼저 내림해서, 할인액이 1원 더 커질 수 있다.
pub fn apply_coupon(orders: List(Order), coupon: Coupon) -> List(Order) {
  list.map(orders, fn(order) {
    case order.status {
      Pending if order.amount >= coupon.min_amount -> {
        let discounted = order.amount * { 100 - coupon.percent } / 100
        let discount = int.min(order.amount - discounted, coupon.max_discount)
        Order(..order, amount: order.amount - discount)
      }
      _ -> order
    }
  })
}
