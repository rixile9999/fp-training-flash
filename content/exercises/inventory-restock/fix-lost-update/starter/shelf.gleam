import gleam/list

pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}

pub fn refill(shelves: List(Shelf)) -> List(Shelf) {
  list.each(shelves, fn(shelf) {
    case shelf.stock.on_hand < shelf.stock.minimum {
      True ->
        Shelf(..shelf, stock: Stock(..shelf.stock, on_hand: shelf.stock.capacity))
      False -> shelf
    }
  })
  shelves
}
