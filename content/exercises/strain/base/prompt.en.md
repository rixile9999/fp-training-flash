Write two functions that take a list and a condition function (`fn(t) -> Bool`).

- `keep(items, predicate)`: return a list with only the elements for which the condition is `True`.
- `discard(items, predicate)`: throw away the elements for which the condition is `True` and return the rest.
- Both functions keep the remaining elements in their original order.
- Do not use filtering functions such as `list.filter` or `list.partition`. Implement them with recursion.

For the same list and condition, the results of `keep` and `discard` together contain every original element.

```gleam
keep([1, 2, 3, 4, 5], int.is_even)
// -> [2, 4]
discard([1, 2, 3, 4, 5], int.is_even)
// -> [1, 3, 5]
```
