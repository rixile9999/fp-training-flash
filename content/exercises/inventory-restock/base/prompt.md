창고 품목 목록을 받아, 재고가 부족한 품목만 보충한 새 목록을 반환하세요.

```gleam
pub type Stock {
  Stock(on_hand: Int, reorder_point: Int, reorder_qty: Int)
}

pub type Item {
  Item(sku: String, name: String, stock: Stock)
}
```

- `stock.on_hand`가 `stock.reorder_point` **이하**이면 `on_hand`에 `reorder_qty`를 더한다.
- `on_hand` 말고 다른 필드는 바꾸지 않는다.
- 보충하지 않는 품목도 결과에 그대로 포함하고, 원래 순서를 유지한다.

```gleam
restock([
  Item("P-01", "볼펜", Stock(on_hand: 3, reorder_point: 5, reorder_qty: 20)),
  Item("N-07", "노트", Stock(on_hand: 40, reorder_point: 10, reorder_qty: 30)),
])
// -> [
//   Item("P-01", "볼펜", Stock(on_hand: 23, reorder_point: 5, reorder_qty: 20)),
//   Item("N-07", "노트", Stock(on_hand: 40, reorder_point: 10, reorder_qty: 30)),
// ]
```
