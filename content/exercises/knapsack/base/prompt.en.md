A mountain guide is carrying gear up to base camp. Each item has a value and a weight, and the knapsack can hold only up to a fixed weight. Choose the items so that the total value is as large as possible, and return that **total value**.

```gleam
pub type Item {
  Item(value: Int, weight: Int)
}

pub fn maximum_value(items: List(Item), maximum_weight: Int) -> Int
```

- The total weight of the chosen items must be at most `maximum_weight`.
- There is only one of each item. Each item is either packed or not.
- All values and weights are positive integers. If nothing can be packed, the answer is 0.
- It must finish within the time limit even with 50 items.

```gleam
maximum_value(
  [Item(value: 10, weight: 5), Item(value: 40, weight: 4),
   Item(value: 30, weight: 6), Item(value: 50, weight: 4)],
  10,
)
// -> 90 (the second and fourth items, weight 8)
```
