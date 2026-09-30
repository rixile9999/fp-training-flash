import gleam/int
import gleam/io
import gleam/list

pub type Product {
  Product(sku: String, price: Int)
}

pub type Effect {
  Log(message: String)
  Notify(customer: String, message: String)
}

pub fn drop_percent(old_price: Int, new_price: Int) -> Int {
  case old_price <= 0 || new_price >= old_price {
    True -> 0
    False -> { old_price - new_price } * 100 / old_price
  }
}

pub fn change_price(
  product: Product,
  new_price: Int,
  watchers: List(String),
) -> #(Product, List(Effect)) {
  let percent = drop_percent(product.price, new_price)
  let log =
    Log(
      product.sku
      <> " 가격 변경: "
      <> int.to_string(product.price)
      <> " -> "
      <> int.to_string(new_price),
    )
  let message = product.sku <> " 가격이 " <> int.to_string(percent) <> "% 내렸습니다"
  let notices = case percent >= 20 {
    True -> list.map(watchers, fn(customer) { Notify(customer, message) })
    False -> []
  }
  #(Product(..product, price: new_price), [log, ..notices])
}

fn run(effect: Effect) -> Nil {
  case effect {
    Log(message) -> io.println(message)
    Notify(customer, message) -> io.println(customer <> "에게 알림: " <> message)
  }
}

/// 효과는 여기서만 실행합니다.
pub fn update_price(
  product: Product,
  new_price: Int,
  watchers: List(String),
) -> Product {
  let #(updated, effects) = change_price(product, new_price, watchers)
  list.each(effects, run)
  updated
}
