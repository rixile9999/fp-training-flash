import gleam/int
import gleam/list

pub type Product {
  Product(name: String, price: Int)
}

pub fn deal_price(price: Int) -> Int {
  price * 70 / 100 / 100 * 100
}

pub fn apply_deal(products: List(Product), index: Int) -> List(Product) {
  list.index_map(products, fn(product, i) {
    case i == index {
      True -> Product(..product, price: deal_price(product.price))
      False -> product
    }
  })
}

/// 무작위 값은 여기서만 만듭니다.
pub fn pick_daily_deal(products: List(Product)) -> List(Product) {
  apply_deal(products, int.random(list.length(products)))
}
