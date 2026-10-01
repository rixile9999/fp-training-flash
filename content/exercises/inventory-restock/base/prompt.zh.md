给定仓库商品列表，返回一个只给库存不足的商品补了货的新列表。

```gleam
pub type Stock {
  Stock(on_hand: Int, reorder_point: Int, reorder_qty: Int)
}

pub type Item {
  Item(sku: String, name: String, stock: Stock)
}
```

- 如果 `stock.on_hand` **小于或等于** `stock.reorder_point`，就给 `on_hand` 加上 `reorder_qty`。
- 不修改 `on_hand` 以外的字段。
- 不需要补货的商品也原样包含在结果中，并保持原来的顺序。

```gleam
restock([
  Item("P-01", "圆珠笔", Stock(on_hand: 3, reorder_point: 5, reorder_qty: 20)),
  Item("N-07", "笔记本", Stock(on_hand: 40, reorder_point: 10, reorder_qty: 30)),
])
// -> [
//   Item("P-01", "圆珠笔", Stock(on_hand: 23, reorder_point: 5, reorder_qty: 20)),
//   Item("N-07", "笔记本", Stock(on_hand: 40, reorder_point: 10, reorder_qty: 30)),
// ]
```
