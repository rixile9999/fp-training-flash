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

// 상태만 보고 최소 주문 금액 조건을 빠뜨린다.
pub fn apply_coupon(orders: List(Order), coupon: Coupon) -> List(Order) {
  list.map(orders, fn(order) {
    case order.status {
      Pending -> {
        let discount =
          int.min(order.amount * coupon.percent / 100, coupon.max_discount)
        Order(..order, amount: order.amount - discount)
      }
      Shipped | Cancelled -> order
    }
  })
}
