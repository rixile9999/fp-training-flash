import gleam/list

pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}

pub fn refill(shelves: List(Shelf)) -> List(Shelf) {
  list.map(shelves, refill_one)
}

fn refill_one(shelf: Shelf) -> Shelf {
  let stock = shelf.stock
  case stock.on_hand < stock.minimum {
    True -> Shelf(..shelf, stock: Stock(..stock, on_hand: stock.capacity))
    False -> shelf
  }
}
