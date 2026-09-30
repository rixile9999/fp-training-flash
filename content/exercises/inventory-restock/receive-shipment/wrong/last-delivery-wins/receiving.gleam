import gleam/dict
import gleam/list

pub type Stock {
  Stock(on_hand: Int, reserved: Int)
}

pub type Item {
  Item(sku: String, stock: Stock)
}

pub type Delivery {
  Delivery(sku: String, quantity: Int)
}

// dict.from_list는 같은 키가 여러 번 나오면 마지막 값만 남긴다.
pub fn receive(items: List(Item), deliveries: List(Delivery)) -> List(Item) {
  let totals =
    deliveries
    |> list.map(fn(delivery) { #(delivery.sku, delivery.quantity) })
    |> dict.from_list
  list.map(items, fn(item) {
    case dict.get(totals, item.sku) {
      Ok(quantity) ->
        Item(
          ..item,
          stock: Stock(..item.stock, on_hand: item.stock.on_hand + quantity),
        )
      Error(Nil) -> item
    }
  })
}
