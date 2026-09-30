import gleeunit/should
import receiving.{Delivery, Item, Stock, receive}

pub fn no_deliveries_test() {
  receive([Item("BOX-S", Stock(10, 2))], [])
  |> should.equal([Item("BOX-S", Stock(10, 2))])
}

pub fn single_delivery_test() {
  receive([Item("BOX-L", Stock(4, 0))], [Delivery("BOX-L", 6)])
  |> should.equal([Item("BOX-L", Stock(10, 0))])
}

pub fn keeps_undelivered_items_test() {
  receive([Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(4, 0))], [
    Delivery("BOX-L", 6),
  ])
  |> should.equal([Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(10, 0))])
}

pub fn sums_repeated_deliveries_test() {
  receive([Item("TAPE", Stock(1, 1))], [
    Delivery("TAPE", 3),
    Delivery("TAPE", 7),
    Delivery("TAPE", 2),
  ])
  |> should.equal([Item("TAPE", Stock(13, 1))])
}

pub fn ignores_unknown_sku_test() {
  receive([Item("BOX-S", Stock(10, 2))], [
    Delivery("WRAP", 50),
    Delivery("BOX-S", 1),
  ])
  |> should.equal([Item("BOX-S", Stock(11, 2))])
}

pub fn keeps_order_and_reserved_test() {
  receive(
    [
      Item("C", Stock(0, 0)),
      Item("A", Stock(5, 3)),
      Item("B", Stock(2, 2)),
    ],
    [Delivery("B", 4), Delivery("C", 1)],
  )
  |> should.equal([
    Item("C", Stock(1, 0)),
    Item("A", Stock(5, 3)),
    Item("B", Stock(6, 2)),
  ])
}
