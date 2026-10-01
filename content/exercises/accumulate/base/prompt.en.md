Write `accumulate(list, fun)`, which takes a list and a function and returns a new list with the function applied to each element. In this exercise you build what the standard library's `list.map` does yourself.

- The result list has the same length as the input, and the elements stay in the same order.
- The type of the result elements may differ from the input. (`fn(a) -> b`)
- Do not use map-style functions such as `list.map` or `list.index_map`. Implement it with recursion.

```gleam
accumulate([1, 2, 3], fn(x) { x * x })
// -> [1, 4, 9]
```
