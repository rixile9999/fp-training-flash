import gleam/list

pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}

// 채울 진열대만 남기고 나머지를 잃는다.
pub fn refill(shelves: List(Shelf)) -> List(Shelf) {
  shelves
  |> list.filter(fn(shelf) { shelf.stock.on_hand < shelf.stock.minimum })
  |> list.map(fn(shelf) {
    Shelf(..shelf, stock: Stock(..shelf.stock, on_hand: shelf.stock.capacity))
  })
}
