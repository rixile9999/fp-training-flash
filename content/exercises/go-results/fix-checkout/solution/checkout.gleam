import gleam/result

pub type Status {
  Draft
  Paid
}

pub type Order {
  Order(id: Int, amount: Int, status: Status)
}

pub fn checkout(
  order: Order,
  check_stock: fn(Order) -> Result(Order, String),
  apply_points: fn(Order) -> Order,
  charge: fn(Order) -> Result(Order, String),
) -> Result(Order, String) {
  use checked <- result.try(check_stock(order))
  let discounted = apply_points(checked)
  use charged <- result.try(charge(discounted))
  Ok(Order(..charged, status: Paid))
}
