Given a list of coin denominations and an amount, count the **number of distinct combinations** that make that amount.

```gleam
pub fn count_ways(coins: List(Int), target: Int) -> Int
```

- You can use any number of coins of each denomination. `coins` are distinct positive integers.
- The order in which coins are handed over does not matter. Two combinations are the same if they use the same number of each denomination. (1 + 2 and 2 + 1 count as one.)
- If `target` is 0, the answer is 1 (the one way that uses no coins). If the amount cannot be made or is negative, the answer is 0.
- Even making 2000 from 8 coin types (the answer is over 20 billion) must finish within the time limit.

```gleam
count_ways([1, 2, 5], 5)
// -> 4
// 5 / 2 + 2 + 1 / 2 + 1 + 1 + 1 / 1 + 1 + 1 + 1 + 1
```
