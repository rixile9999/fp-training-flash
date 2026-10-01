Implement merge sort, which sorts a list of integers in ascending order, split into three functions. The tests call each of the three functions.

- `split(items: List(Int)) -> #(List(Int), List(Int))`: split into the first `length / 2` elements (integer division) and the rest. Keep the elements in their original order.
- `merge(left: List(Int), right: List(Int)) -> List(Int)`: combine two ascending lists into one ascending list. Keep every copy of equal values.
- `sort(items: List(Int)) -> List(Int)`: split with `split`, sort each half recursively, and combine them with `merge`.
- It must finish within the time limit even with 150,000 elements (O(n log n)). Do not use `list.sort`. You may use `list.length` and `list.split`.

```gleam
split([5, 1, 4])           // -> #([5], [1, 4])
merge([1, 5], [2, 4])      // -> [1, 2, 4, 5]
sort([5, 2, 9, 1, 5, 6])   // -> [1, 2, 5, 5, 6, 9]
```
