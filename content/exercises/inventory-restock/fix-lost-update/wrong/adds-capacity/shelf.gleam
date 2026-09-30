import gleam/list

pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}

// 순회는 map으로 고쳤지만, 최대 용량으로 맞추지 않고 남은 수량에 더한다.
pub fn refill(shelves: List(Shelf)) -> List(Shelf) {
  list.map(shelves, fn(shelf) {
    let stock = shelf.stock
    case stock.on_hand < stock.minimum {
      True ->
        Shelf(
          ..shelf,
          stock: Stock(..stock, on_hand: stock.on_hand + stock.capacity),
        )
      False -> shelf
    }
  })
}
