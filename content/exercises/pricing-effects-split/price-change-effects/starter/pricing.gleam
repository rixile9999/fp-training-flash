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

// 기존 코드: 계산 도중에 기록과 알림을 바로 출력합니다.
pub fn update_price(
  product: Product,
  new_price: Int,
  watchers: List(String),
) -> Product {
  io.println(
    product.sku
    <> " 가격 변경: "
    <> int.to_string(product.price)
    <> " -> "
    <> int.to_string(new_price),
  )
  let percent = { product.price - new_price } * 100 / product.price
  case percent >= 20 {
    True ->
      list.each(watchers, fn(customer) {
        io.println(
          customer
          <> "에게 알림: "
          <> product.sku
          <> " 가격이 "
          <> int.to_string(percent)
          <> "% 내렸습니다",
        )
      })
    False -> Nil
  }
  Product(..product, price: new_price)
}

pub fn drop_percent(old_price: Int, new_price: Int) -> Int {
  todo
}

pub fn change_price(
  product: Product,
  new_price: Int,
  watchers: List(String),
) -> #(Product, List(Effect)) {
  todo
}
