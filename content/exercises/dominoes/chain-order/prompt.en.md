Build a chain that loops all the way around from a list of domino stones, and return the chain itself.

```gleam
pub fn chain(stones: List(#(Int, Int))) -> Result(List(#(Int, Int)), Nil)
```

- The result is a list that uses every input stone exactly once. If several stones have the same shape, each one is used separately.
- Write each stone in the result in the orientation it was actually placed. If the input `#(3, 1)` was placed flipped, write it as `#(1, 3)` in the result.
- For any two neighboring stones in the result, the right number of the earlier stone equals the left number of the later one, and the left number of the first stone equals the right number of the last stone.
- If several chains are possible, return any one of them. With no stones, return `Ok([])`; if no chain can be built, return `Error(Nil)`.

`selections`, which builds the pairs of each element and the rest with only that element removed, is already provided.

```gleam
chain([#(1, 2), #(3, 1), #(2, 3)])
// -> Ok([#(1, 2), #(2, 3), #(3, 1)])   any other valid chain is also accepted
chain([#(1, 2), #(4, 1), #(2, 3)])
// -> Error(Nil)
```
