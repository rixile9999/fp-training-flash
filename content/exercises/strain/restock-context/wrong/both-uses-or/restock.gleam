import gleam/list

pub type Product {
  Product(name: String, stock: Int, active: Bool)
}

/// 조건이 참인 원소만 순서대로 남긴다. (이미 완성된 함수)
pub fn keep(items: List(t), predicate: fn(t) -> Bool) -> List(t) {
  go(items, predicate, [])
}

fn go(items: List(t), predicate: fn(t) -> Bool, acc: List(t)) -> List(t) {
  case items {
    [] -> list.reverse(acc)
    [first, ..rest] ->
      case predicate(first) {
        True -> go(rest, predicate, [first, ..acc])
        False -> go(rest, predicate, acc)
      }
  }
}

pub fn both(p: fn(t) -> Bool, q: fn(t) -> Bool) -> fn(t) -> Bool {
  fn(item) { p(item) || q(item) }
}

pub fn negate(p: fn(t) -> Bool) -> fn(t) -> Bool {
  fn(item) { !p(item) }
}

pub fn needs_restock(products: List(Product), threshold: Int) -> List(Product) {
  keep(products, both(is_active, fn(product) { product.stock < threshold }))
}

pub fn discontinued(products: List(Product)) -> List(Product) {
  keep(products, negate(is_active))
}

fn is_active(product: Product) -> Bool {
  product.active
}
