import gleam/int
import gleam/list

pub type Product {
  Product(name: String, price: Int)
}

// Existing code: random selection and discount calculation are mixed together, so the result is unpredictable.
pub fn pick_daily_deal(products: List(Product)) -> List(Product) {
  let chosen = int.random(list.length(products))
  list.index_map(products, fn(product, i) {
    case i == chosen {
      True -> Product(..product, price: product.price * 70 / 100 / 100 * 100)
      False -> product
    }
  })
}

pub fn deal_price(price: Int) -> Int {
  todo
}

pub fn apply_deal(products: List(Product), index: Int) -> List(Product) {
  todo
}
