A self-checkout kiosk uses `min_coins` to work out how many coins to give as change. The current code picks the largest coin that fits into the remaining amount first, and at a store abroad with denominations `[1, 4, 15, 20, 50]` it computed 4 coins (20 + 1 + 1 + 1) for 23 in change. 4 + 4 + 15, just 3 coins, would do. Fix it so it always returns the fewest coins.

- You can use any number of coins of each denomination. `coins` are distinct positive integers.
- Return the fewest number of coins in `Ok`. If `target` is 0, the result is `Ok(0)`.
- If no combination can make the amount, or `target` is negative, the result is `Error(ImpossibleTarget)`.
- Even an amount of 9999 must finish within the time limit.

```gleam
min_coins([1, 4, 15, 20, 50], 23)
// Now:      Ok(4)
// Expected: Ok(3)
```
