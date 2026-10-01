Write `accumulate_indexed(list, fun)`. It passes each element together with that element's **position** to the function and builds a new list from the results.

- Call `fun(element, position)`. The first element's position is 0, and it increases by one for each element.
- The result list has the same length and order as the input.
- Do not use map-style functions such as `list.map` or `list.index_map`. Implement it with recursion.

```gleam
accumulate_indexed(["a", "b", "c"], fn(x, i) { #(i, x) })
// -> [#(0, "a"), #(1, "b"), #(2, "c")]
```
