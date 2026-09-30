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
  let stock = check_stock(order)
  let discounted = apply_points(result.unwrap(stock, order))
  case charge(discounted), stock {
    Error(message), _ -> Error(message)
    _, Error(message) -> Error(message)
    Ok(charged), Ok(_) -> Ok(Order(..charged, status: Paid))
  }
}
