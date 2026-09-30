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

pub fn receive(items: List(Item), deliveries: List(Delivery)) -> List(Item) {
  todo
}
