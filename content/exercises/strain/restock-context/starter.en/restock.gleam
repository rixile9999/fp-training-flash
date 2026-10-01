import gleam/list

pub type Product {
  Product(name: String, stock: Int, active: Bool)
}

/// Keeps only the elements for which the condition is true, in order. (Already complete.)
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
  todo
}

pub fn negate(p: fn(t) -> Bool) -> fn(t) -> Bool {
  todo
}

pub fn needs_restock(products: List(Product), threshold: Int) -> List(Product) {
  todo
}

pub fn discontinued(products: List(Product)) -> List(Product) {
  todo
}
