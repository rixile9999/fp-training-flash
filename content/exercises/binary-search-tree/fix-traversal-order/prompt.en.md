The module below sorts integers with a binary search tree (left if smaller or equal, right if greater). But there is a report that `sorted_data([2, 1, 3])` returns `[2, 1, 3]` instead of `[1, 2, 3]`. Fix it.

- `sorted_data(data)` returns the values of `data` in ascending order, keeping every copy of equal values.
- `to_tree` is used elsewhere too, so the shape of the tree must not change.

```gleam
sorted_data([2, 1, 3, 6, 7, 5])
// now:      [2, 1, 3, 6, 5, 7]
// expected: [1, 2, 3, 5, 6, 7]
```
