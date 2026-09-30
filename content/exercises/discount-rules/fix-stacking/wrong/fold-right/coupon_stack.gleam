import gleam/int
import gleam/list

pub type Coupon {
  Percent(Int)
  Fixed(Int)
}

pub fn apply_coupon(price: Int, coupon: Coupon) -> Int {
  case coupon {
    Percent(percent) -> price * { 100 - percent } / 100
    Fixed(amount) -> int.max(price - amount, 0)
  }
}

pub fn apply_all(price: Int, coupons: List(Coupon)) -> Int {
  list.fold_right(coupons, price, fn(total, coupon) { apply_coupon(total, coupon) })
}

pub fn best_single(price: Int, coupons: List(Coupon)) -> Int {
  coupons
  |> list.map(apply_coupon(price, _))
  |> list.fold(price, int.min)
}
