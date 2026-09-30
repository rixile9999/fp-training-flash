import gleam/list

pub type Status {
  Pending
  Shipped
  Cancelled
}

pub type Order {
  Order(id: Int, status: Status, amount: Int)
}

// 할인한 주문과 나머지 주문을 따로 모아 이어 붙여서 순서가 바뀐다.
pub fn apply_coupon(orders: List(Order), percent: Int) -> List(Order) {
  let #(pending, others) = list.partition(orders, fn(o) { o.status == Pending })
  let discounted =
    list.map(pending, fn(o) {
      Order(..o, amount: o.amount * { 100 - percent } / 100)
    })
  list.append(discounted, others)
}
