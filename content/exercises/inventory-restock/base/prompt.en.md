Given a list of warehouse items, return a new list in which only the items running low have been restocked.

```gleam
pub type Stock {
  Stock(on_hand: Int, reorder_point: Int, reorder_qty: Int)
}

pub type Item {
  Item(sku: String, name: String, stock: Stock)
}
```

- If `stock.on_hand` is **less than or equal to** `stock.reorder_point`, add `reorder_qty` to `on_hand`.
- Do not change any field other than `on_hand`.
- Items that are not restocked are also included in the result unchanged, and the original order is kept.

```gleam
restock([
  Item("P-01", "Ballpoint pen", Stock(on_hand: 3, reorder_point: 5, reorder_qty: 20)),
  Item("N-07", "Notebook", Stock(on_hand: 40, reorder_point: 10, reorder_qty: 30)),
])
// -> [
//   Item("P-01", "Ballpoint pen", Stock(on_hand: 23, reorder_point: 5, reorder_qty: 20)),
//   Item("N-07", "Notebook", Stock(on_hand: 40, reorder_point: 10, reorder_qty: 30)),
// ]
```
