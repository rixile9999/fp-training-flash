import checkout.{type Order, Draft, Order, Paid}
import gleeunit/should

fn in_stock(order: Order) -> Result(Order, String) {
  Ok(order)
}

fn out_of_stock(_order: Order) -> Result(Order, String) {
  Error("재고 부족")
}

fn add_packaging_fee(order: Order) -> Result(Order, String) {
  Ok(Order(..order, amount: order.amount + 500))
}

fn use_1000_points(order: Order) -> Order {
  Order(..order, amount: order.amount - 1000)
}

fn charge_ok(order: Order) -> Result(Order, String) {
  Ok(order)
}

fn card_declined(_order: Order) -> Result(Order, String) {
  Error("카드 승인 거절")
}

fn limit_10000(order: Order) -> Result(Order, String) {
  case order.amount <= 10_000 {
    True -> Ok(order)
    False -> Error("한도 초과")
  }
}

pub fn successful_checkout_test() {
  Order(1, 5000, Draft)
  |> checkout.checkout(in_stock, use_1000_points, charge_ok)
  |> should.equal(Ok(Order(1, 4000, Paid)))
}

pub fn charge_failure_test() {
  Order(2, 5000, Draft)
  |> checkout.checkout(in_stock, use_1000_points, card_declined)
  |> should.equal(Error("카드 승인 거절"))
}

pub fn stock_failure_test() {
  Order(3, 5000, Draft)
  |> checkout.checkout(out_of_stock, use_1000_points, charge_ok)
  |> should.equal(Error("재고 부족"))
}

pub fn stock_error_wins_over_charge_error_test() {
  Order(4, 5000, Draft)
  |> checkout.checkout(out_of_stock, use_1000_points, card_declined)
  |> should.equal(Error("재고 부족"))
}

pub fn charge_sees_discounted_amount_test() {
  Order(5, 10_500, Draft)
  |> checkout.checkout(in_stock, use_1000_points, limit_10000)
  |> should.equal(Ok(Order(5, 9500, Paid)))
}

pub fn points_use_stock_checked_order_test() {
  Order(6, 5000, Draft)
  |> checkout.checkout(add_packaging_fee, use_1000_points, charge_ok)
  |> should.equal(Ok(Order(6, 4500, Paid)))
}
