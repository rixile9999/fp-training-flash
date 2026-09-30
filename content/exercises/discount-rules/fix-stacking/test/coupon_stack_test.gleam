import coupon_stack.{Fixed, Percent, apply_all, apply_coupon, best_single}
import gleeunit/should

pub fn apply_coupon_percent_test() {
  apply_coupon(10_000, Percent(15))
  |> should.equal(8500)
}

pub fn apply_coupon_fixed_floor_test() {
  apply_coupon(500, Fixed(1000))
  |> should.equal(0)
}

pub fn apply_all_stacks_test() {
  apply_all(10_000, [Percent(10), Fixed(1000)])
  |> should.equal(8000)
}

pub fn apply_all_order_test() {
  apply_all(10_000, [Fixed(1000), Percent(10)])
  |> should.equal(8100)
}

pub fn apply_all_empty_test() {
  apply_all(5000, [])
  |> should.equal(5000)
}

pub fn best_single_test() {
  best_single(10_000, [Percent(10), Fixed(2000), Percent(5)])
  |> should.equal(8000)
}

pub fn best_single_no_coupons_test() {
  best_single(5000, [])
  |> should.equal(5000)
}
