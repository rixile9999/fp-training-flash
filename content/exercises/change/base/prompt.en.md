You want to give change with as few coins as possible. Given the list of available coin denominations and the amount to give back, find the combination with the fewest coins.

```gleam
pub type ChangeError {
  ImpossibleTarget
}

pub fn find_fewest_coins(coins: List(Int), target: Int) -> Result(List(Int), ChangeError)
```

- You can use any number of coins of each denomination. `coins` are distinct positive integers.
- Return the combination with the fewest coins as an **ascending** list inside `Ok`. (In the test inputs, there is only one smallest combination.)
- If `target` is 0, the result is `Ok([])`.
- If no combination can make the amount, or `target` is negative, the result is `Error(ImpossibleTarget)`.
- Picking the largest coin first is not always optimal. Even an amount of 999 must finish within the time limit.

```gleam
find_fewest_coins([1, 4, 15, 20, 50], 23)
// -> Ok([4, 4, 15])
// Picking the largest coin first gives 20 + 1 + 1 + 1, which is 4 coins, but 4 + 4 + 15 is 3 coins.
```
