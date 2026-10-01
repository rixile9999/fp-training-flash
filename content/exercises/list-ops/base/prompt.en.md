Implement three list operations yourself, without using `gleam/list`.

- `foldl(over: list, from: initial, with: function)`: call `function(accumulator, element)` on the list **starting from the first element**, and return the final accumulated value. For an empty list, return `initial` as is.
- `length(list)`: return the number of elements.
- `reverse(list)`: return a new list with the elements in reverse order.
- A list of 200,000 elements must also be handled within the time limit. Do not walk through or copy the whole list again for each element you process.

```gleam
foldl(over: ["a", "b", "c"], from: "", with: fn(acc, s) { acc <> s })
// -> "abc"
length([1, 2, 3, 4])   // -> 4
reverse([1, 3, 5, 7])  // -> [7, 5, 3, 1]
```
