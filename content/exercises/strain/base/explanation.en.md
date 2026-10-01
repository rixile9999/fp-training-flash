`keep` walks down the list one element at a time and only decides "keep it?" for each element. If the condition is true it adds the element to the accumulator; if false it skips it. Because the elements were stacked at the front of the accumulator, `list.reverse` restores the original order at the end.

```gleam
case items {
  [] -> list.reverse(acc)
  [first, ..rest] ->
    case predicate(first) {
      True -> go(rest, predicate, [first, ..acc])
      False -> go(rest, predicate, acc)
    }
}
```

`discard` is "keep with the condition flipped". If you build it as `keep(items, fn(item) { !predicate(item) })` instead of writing the recursion again, the traversal and the order-keeping rule live in one place only, so the two functions can never drift apart. This style of assembling behavior by passing functions as values is covered in the theory note higher-order-modularity (Higher-order functions and modularity). The accumulator and the final reverse are covered in accumulators-and-tail-recursion (Accumulators and tail recursion).

There are two common mistakes:

- Stacking into an accumulator without reversing, so you get `[3, 1]` instead of `[1, 3]`.
- Copying `discard` from `keep` and forgetting to flip the condition, so both functions give the same result.
