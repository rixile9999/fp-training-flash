//// Performance module (test files): setup builds the input, run calls the learner code.
import coupon.{type Order, Order, Pending, Shipped, apply_coupon}
import gleam/int

pub fn setup(size: Int) -> List(Order) {
  int.range(from: 0, to: size, with: [], run: fn(acc, i) {
    let status = case i % 2 {
      0 -> Pending
      _ -> Shipped
    }
    [Order(i, status, 1000 + i), ..acc]
  })
}

pub fn run(orders: List(Order)) -> List(Order) {
  apply_coupon(orders, 10)
}
