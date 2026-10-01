import gleam/int
import gleam/list

pub type Product {
  Product(name: String, price: Int)
}

// 现有代码：随机选择和折扣计算混在一起，结果无法预测。
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
