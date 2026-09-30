편의점 진열대 목록을 받아, 비어 가는 진열대를 채운 새 목록을 반환하는 `refill` 함수가 있습니다. 그런데 이 함수는 무엇을 넣어도 입력을 그대로 돌려줍니다. 고치세요.

```gleam
pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}
```

- `stock.on_hand`가 `stock.minimum`보다 **적으면** `on_hand`를 `capacity`로 바꾼다(더하지 않는다).
- 그 밖의 진열대는 그대로 두고, 모든 진열대를 원래 순서대로 결과에 포함한다.

```gleam
refill([
  Shelf("A1", "생수", Stock(on_hand: 2, minimum: 5, capacity: 24)),
  Shelf("B3", "컵라면", Stock(on_hand: 9, minimum: 4, capacity: 12)),
])
// -> [
//   Shelf("A1", "생수", Stock(on_hand: 24, minimum: 5, capacity: 24)),
//   Shelf("B3", "컵라면", Stock(on_hand: 9, minimum: 4, capacity: 12)),
// ]
```
