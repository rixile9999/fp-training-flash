물류 창고의 품목 목록과 오늘의 입고 내역을 받아, 입고된 수량을 재고에 반영한 새 품목 목록을 반환하세요.

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

- 입고의 `sku`와 같은 품목의 `stock.on_hand`에 `quantity`를 더한다.
- 같은 `sku`의 입고가 여러 번 있으면 모두 더한다.
- 품목 목록에 없는 `sku`의 입고는 무시한다(새 품목을 만들지 않는다).
- `reserved`는 바꾸지 않는다. 입고가 없는 품목도 결과에 포함하고, 품목의 원래 순서를 유지한다.

```gleam
receive(
  [Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(4, 0))],
  [Delivery("BOX-L", 6), Delivery("TAPE", 3), Delivery("BOX-L", 5)],
)
// -> [Item("BOX-S", Stock(10, 2)), Item("BOX-L", Stock(15, 0))]
```
