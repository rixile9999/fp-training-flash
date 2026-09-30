import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}

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
  let totals = totals_by_sku(deliveries)
  list.map(items, fn(item) {
    case dict.get(totals, item.sku) {
      Ok(quantity) -> add_stock(item, quantity)
      Error(Nil) -> item
    }
  })
}

fn totals_by_sku(deliveries: List(Delivery)) -> Dict(String, Int) {
  list.fold(deliveries, dict.new(), fn(totals, delivery) {
    dict.upsert(totals, delivery.sku, fn(existing) {
      case existing {
        Some(sum) -> sum + delivery.quantity
        None -> delivery.quantity
      }
    })
  })
}

fn add_stock(item: Item, quantity: Int) -> Item {
  let stock = item.stock
  Item(..item, stock: Stock(..stock, on_hand: stock.on_hand + quantity))
}
