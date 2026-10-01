Implement two functions that join lists, without using `gleam/list`.

- `append(first:, second:)`: return a list with the elements of `second` placed after the elements of `first`, in order.
- `concat(lists)`: take a list of lists and return a single list with the inner lists joined in order. Flatten only one level (if an element is a list, that list stays as an element).
- Even 100,000 small lists must finish within the time limit. The cost must be proportional to the **total number of elements**.

```gleam
append(first: [1, 2], second: [2, 3, 4, 5])  // -> [1, 2, 2, 3, 4, 5]
concat([[1, 2], [3], [], [4, 5, 6]])          // -> [1, 2, 3, 4, 5, 6]
concat([[[1], [2]], [[3]]])                   // -> [[1], [2], [3]]
```
