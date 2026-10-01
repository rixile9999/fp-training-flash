---
id: gleam-sorting-order
title: Sorting and Order
---
`list.sort(xs, by: compare)` sorts using a function that compares two values and returns an `Order` (`Lt`, `Eq`, `Gt`).
`Lt` means the first value comes first. Items that compare as `Eq` keep their original order (a stable sort).

| Function | What it does |
|---|---|
| `int.compare`, `float.compare`, `string.compare` | Standard ascending comparison |
| `order.reverse(int.compare)` | Flips a comparison function for descending order |
| `fn(a, b) { int.compare(b, a) }` | Swaps the arguments for descending order |
| `order.break_tie(first, second)` | Decides with `second` only when `first` is `Eq` |
| `order.negate(o)` | Swaps `Lt` and `Gt` |

```gleam
import gleam/int
import gleam/list
import gleam/order
import gleam/string

pub type Player {
  Player(name: String, score: Int)
}

// Score descending; for equal scores, name ascending
pub fn ranking(players: List(Player)) -> List(Player) {
  list.sort(players, fn(a, b) {
    int.compare(b.score, a.score)
    |> order.break_tie(string.compare(a.name, b.name))
  })
}
// ranking([Player("c", 10), Player("a", 20), Player("b", 10)])
//   == [Player("a", 20), Player("b", 10), Player("c", 10)]
```

When there are several sort keys, chain them by priority with `break_tie` or with `case ... { order.Eq -> next key  other -> other }`.

Common mistake: sorting in ascending order and then using `list.reverse` to get descending order. That also reverses the original order
of items with equal scores. Build descending order by flipping the comparison function itself.
