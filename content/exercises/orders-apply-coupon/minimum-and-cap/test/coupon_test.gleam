import coupon.{Cancelled, Coupon, Order, Pending, Shipped, apply_coupon}
import gleeunit/should

pub fn discounts_pending_test() {
  apply_coupon([Order(1, Pending, 20_000)], Coupon(10, 10_000, 5000))
  |> should.equal([Order(1, Pending, 18_000)])
}

pub fn skips_below_minimum_test() {
  apply_coupon([Order(2, Pending, 8000)], Coupon(10, 10_000, 5000))
  |> should.equal([Order(2, Pending, 8000)])
}

pub fn caps_discount_test() {
  apply_coupon([Order(3, Pending, 100_000)], Coupon(10, 10_000, 5000))
  |> should.equal([Order(3, Pending, 95_000)])
}

pub fn applies_at_exact_minimum_test() {
  apply_coupon([Order(4, Pending, 10_000)], Coupon(20, 10_000, 5000))
  |> should.equal([Order(4, Pending, 8000)])
}

pub fn rounds_discount_down_test() {
  apply_coupon([Order(5, Pending, 999)], Coupon(15, 0, 1000))
  |> should.equal([Order(5, Pending, 850)])
}

pub fn keeps_other_orders_test() {
  apply_coupon(
    [
      Order(6, Shipped, 50_000),
      Order(7, Pending, 30_000),
      Order(8, Cancelled, 40_000),
    ],
    Coupon(10, 10_000, 5000),
  )
  |> should.equal([
    Order(6, Shipped, 50_000),
    Order(7, Pending, 27_000),
    Order(8, Cancelled, 40_000),
  ])
}
