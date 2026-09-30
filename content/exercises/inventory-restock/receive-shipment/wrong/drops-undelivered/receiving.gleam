import gleam/dict
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

// 입고가 있는 품목만 남기고 나머지는 결과에서 빠진다.
pub fn receive(items: List(Item), deliveries: List(Delivery)) -> List(Item) {
  let totals =
    list.fold(deliveries, dict.new(), fn(totals, delivery) {
      dict.upsert(totals, delivery.sku, fn(existing) {
        case existing {
          Some(sum) -> sum + delivery.quantity
          None -> delivery.quantity
        }
      })
    })
  list.filter_map(items, fn(item) {
    case dict.get(totals, item.sku) {
      Ok(quantity) ->
        Ok(Item(
          ..item,
          stock: Stock(..item.stock, on_hand: item.stock.on_hand + quantity),
        ))
      Error(Nil) -> Error(Nil)
    }
  })
}
