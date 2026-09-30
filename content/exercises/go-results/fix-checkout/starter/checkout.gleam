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
  let checked = result.unwrap(check_stock(order), order)
  let discounted = apply_points(checked)
  case charge(discounted) {
    Ok(charged) -> Ok(Order(..charged, status: Paid))
    Error(message) -> Error(message)
  }
}
