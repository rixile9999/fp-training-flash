Given the item list of a logistics warehouse and today's deliveries, return a new item list with the delivered quantities added to the stock.

```gleam
pub type Stock {
  Stock(on_hand: Int, reserved: Int)
}

pub type Item {
  Item(sku: String, stock: Stock)
}

pub type Delivery {
  Delivery(sku: String, quantity: Int)
}
```

- Add `quantity` to `stock.on_hand` of the item whose sku matches the delivery's `sku`.
- If there are several deliveries with the same `sku`, add them all.
- Ignore deliveries whose `sku` is not in the item list (do not create new items).
- Do not change `reserved`. Include items that received no delivery in the result too, and keep the original order of the items.

```gleam
receive(
  [Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(4, 0))],
  [Delivery("BOX-L", 6), Delivery("TAPE", 3), Delivery("BOX-L", 5)],
)
// -> [Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(15, 0))]
```
