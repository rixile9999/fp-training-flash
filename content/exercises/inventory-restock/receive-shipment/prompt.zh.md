给定物流仓库的商品列表和今天的入库明细，返回把入库数量计入库存后的新商品列表。

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

- 把 `quantity` 加到与入库记录的 `sku` 相同的商品的 `stock.on_hand` 上。
- 同一个 `sku` 有多条入库记录时，全部相加。
- 忽略商品列表中不存在的 `sku` 的入库（不创建新商品）。
- 不修改 `reserved`。没有入库的商品也包含在结果中，并保持商品原来的顺序。

```gleam
receive(
  [Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(4, 0))],
  [Delivery("BOX-L", 6), Delivery("TAPE", 3), Delivery("BOX-L", 5)],
)
// -> [Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(15, 0))]
```
