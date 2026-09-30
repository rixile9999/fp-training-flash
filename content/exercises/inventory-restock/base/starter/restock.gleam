import gleam/list

pub type Stock {
  Stock(on_hand: Int, reorder_point: Int, reorder_qty: Int)
}

pub type Item {
  Item(sku: String, name: String, stock: Stock)
}

pub fn restock(items: List(Item)) -> List(Item) {
  todo
}
