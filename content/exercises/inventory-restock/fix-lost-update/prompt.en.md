There is a `refill` function that takes a list of convenience store shelves and returns a new list with the shelves that are running low filled up. But whatever you pass in, this function returns its input unchanged. Fix it.

```gleam
pub type Stock {
  Stock(on_hand: Int, minimum: Int, capacity: Int)
}

pub type Shelf {
  Shelf(location: String, product: String, stock: Stock)
}
```

- If `stock.on_hand` is **less than** `stock.minimum`, change `on_hand` to `capacity` (do not add to it).
- Leave all other shelves as they are, and include every shelf in the result in the original order.

```gleam
refill([
  Shelf("A1", "Bottled water", Stock(on_hand: 2, minimum: 5, capacity: 24)),
  Shelf("B3", "Cup noodles", Stock(on_hand: 9, minimum: 4, capacity: 12)),
])
// -> [
//   Shelf("A1", "Bottled water", Stock(on_hand: 24, minimum: 5, capacity: 24)),
//   Shelf("B3", "Cup noodles", Stock(on_hand: 9, minimum: 4, capacity: 12)),
// ]
```
