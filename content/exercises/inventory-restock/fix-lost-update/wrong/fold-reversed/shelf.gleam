import gleam/list

pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}

// 앞에 붙여 가며 모으고 뒤집지 않아서 순서가 거꾸로 된다.
pub fn refill(shelves: List(Shelf)) -> List(Shelf) {
  list.fold(shelves, [], fn(acc, shelf) {
    let updated = case shelf.stock.on_hand < shelf.stock.minimum {
      True ->
        Shelf(..shelf, stock: Stock(..shelf.stock, on_hand: shelf.stock.capacity))
      False -> shelf
    }
    [updated, ..acc]
  })
}
