有一个 `refill` 函数，它接收便利店的货架列表，返回把快空的货架补满后的新列表。可是无论传入什么，这个函数都原样返回输入。请修复它。

```gleam
pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}
```

- 如果 `stock.on_hand` **少于** `stock.minimum`，就把 `on_hand` 改为 `capacity`（不是相加）。
- 其他货架保持不变，所有货架都按原来的顺序包含在结果中。

```gleam
refill([
  Shelf("A1", "矿泉水", Stock(on_hand: 2, minimum: 5, capacity: 24)),
  Shelf("B3", "杯面", Stock(on_hand: 9, minimum: 4, capacity: 12)),
])
// -> [
//   Shelf("A1", "矿泉水", Stock(on_hand: 24, minimum: 5, capacity: 24)),
//   Shelf("B3", "杯面", Stock(on_hand: 9, minimum: 4, capacity: 12)),
// ]
```
