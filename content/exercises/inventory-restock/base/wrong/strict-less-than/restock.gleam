import gleam/list

pub type Stock {
  Stock(on_hand: Int, reorder_point: Int, reorder_qty: Int)
}

pub type Item {
  Item(sku: String, name: String, stock: Stock)
}

pub fn restock(items: List(Item)) -> List(Item) {
  list.map(items, fn(item) {
    let stock = item.stock
    case stock.on_hand < stock.reorder_point {
      True ->
        Item(
          ..item,
          stock: Stock(..stock, on_hand: stock.on_hand + stock.reorder_qty),
        )
      False -> item
    }
  })
}
