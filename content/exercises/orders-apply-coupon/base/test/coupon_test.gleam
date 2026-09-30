import coupon.{Cancelled, Order, Pending, Shipped, apply_coupon}
import gleeunit/should

pub fn empty_list_test() {
  apply_coupon([], 10)
  |> should.equal([])
}

pub fn discounts_pending_test() {
  apply_coupon([Order(1, Pending, 10_000)], 10)
  |> should.equal([Order(1, Pending, 9000)])
}

pub fn keeps_other_orders_test() {
  apply_coupon([Order(1, Pending, 10_000), Order(2, Shipped, 5000)], 10)
  |> should.equal([Order(1, Pending, 9000), Order(2, Shipped, 5000)])
}

pub fn keeps_order_test() {
  apply_coupon(
    [Order(3, Shipped, 100), Order(1, Pending, 200), Order(2, Cancelled, 300)],
    50,
  )
  |> should.equal([
    Order(3, Shipped, 100),
    Order(1, Pending, 100),
    Order(2, Cancelled, 300),
  ])
}

pub fn rounds_down_test() {
  apply_coupon([Order(1, Pending, 999)], 15)
  |> should.equal([Order(1, Pending, 849)])
}
