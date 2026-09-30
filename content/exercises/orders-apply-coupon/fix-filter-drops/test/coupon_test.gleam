import coupon.{Cancelled, Order, Pending, Shipped, apply_coupon}
import gleeunit/should

pub fn discounts_pending_test() {
  apply_coupon([Order(1, Pending, 10_000)], 10)
  |> should.equal([Order(1, Pending, 9000)])
}

pub fn keeps_shipped_orders_test() {
  apply_coupon([Order(1, Pending, 10_000), Order(2, Shipped, 5000)], 10)
  |> should.equal([Order(1, Pending, 9000), Order(2, Shipped, 5000)])
}

pub fn keeps_cancelled_orders_test() {
  apply_coupon([Order(7, Cancelled, 3000)], 20)
  |> should.equal([Order(7, Cancelled, 3000)])
}

pub fn does_not_discount_others_test() {
  apply_coupon([Order(4, Shipped, 8000), Order(5, Cancelled, 2000)], 50)
  |> should.equal([Order(4, Shipped, 8000), Order(5, Cancelled, 2000)])
}

pub fn keeps_order_test() {
  apply_coupon(
    [
      Order(3, Shipped, 100),
      Order(1, Pending, 200),
      Order(2, Cancelled, 300),
      Order(6, Pending, 400),
    ],
    50,
  )
  |> should.equal([
    Order(3, Shipped, 100),
    Order(1, Pending, 100),
    Order(2, Cancelled, 300),
    Order(6, Pending, 200),
  ])
}
