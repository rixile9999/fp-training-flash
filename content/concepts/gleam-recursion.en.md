---
id: gleam-recursion
title: Recursion and accumulators
---
Gleam has no `for` or `while` loops. You write repetition as **recursion**: a function that calls itself again. A list has only two shapes,
`[]` (empty) and `[x, ..rest]` (the first item and the rest), so those two cases are all you need to handle.

| Part | Role |
|---|---|
| Base case | Immediately returns the answer for an input that can't be split further (`[]`, `0`) |
| Recursive case | Shrinks the input by one step (`rest`, `n - 1`) and calls itself |
| Accumulator `acc` | Carries the result so far along as an argument |
| Helper function | A private `loop` function that hides the accumulator's initial value |

```gleam
import gleam/list

// Plain recursion: adds things up on the way back.
pub fn sum(xs: List(Int)) -> Int {
  case xs {
    [] -> 0
    [x, ..rest] -> x + sum(rest)
  }
}

// Tail recursion: the recursive call is the last thing done, so the call stack doesn't grow.
pub fn doubled(xs: List(Int)) -> List(Int) {
  doubled_loop(xs, [])
}

fn doubled_loop(xs: List(Int), acc: List(Int)) -> List(Int) {
  case xs {
    [] -> list.reverse(acc)
    [x, ..rest] -> doubled_loop(rest, [x * 2, ..acc])
  }
}
// doubled([1, 2, 3]) == [2, 4, 6]
```

If the input can be very long, use tail recursion. For simple transformations, `list.map` and `list.fold` already capture this pattern.

Common mistake: an accumulator list is built by adding to the front, so it piles up in reverse. If you forget `list.reverse` in the
base case, the result comes out in reverse order.
