Implement `foldr`, `map` and `filter` without using `gleam/list`.

- `foldr(over: list, from: initial, with: function)`: call `function(accumulator, element)` **starting from the last element** of the list and moving toward the front, and return the accumulated value. For an empty list, return `initial`.
- `map(list, function)`: return a list with `function` applied to every element. Keep the length and order.
- `filter(list, function)`: keep only the elements for which `function(element)` is `True`, in their original order.
- A list of 200,000 elements must also be handled within the time limit.

```gleam
foldr(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
// -> "cba"
map([1, 3, 5, 7], fn(x) { x + 1 })          // -> [2, 4, 6, 8]
filter([1, 2, 3, 5], fn(x) { x % 2 == 1 })  // -> [1, 3, 5]
```
