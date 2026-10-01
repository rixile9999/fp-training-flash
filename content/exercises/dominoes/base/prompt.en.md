Given a list of domino stones, decide whether you can use every stone exactly once to build a chain that goes all the way around in a loop.

```gleam
pub fn can_chain(stones: List(#(Int, Int))) -> Bool
```

- A stone `#(a, b)` has the numbers `a` and `b` on its two sides. A stone can be flipped and placed as `#(b, a)`.
- Two neighboring stones must have the same number on the sides that touch.
- The outer number of the first stone must also equal the outer number of the last stone (a full loop).
- There may be several stones of the same shape, and each one must be used separately, once.
- With no stones, the answer is `True`.

`selections`, which builds the pairs of each element and the rest with only that element removed, is already provided. Even if several stones have the same shape, it removes just one, by position.

```gleam
can_chain([#(2, 1), #(2, 3), #(1, 3)])
// -> True    [1|2] [2|3] [3|1]
can_chain([#(1, 2), #(4, 1), #(2, 3)])
// -> False   [4|1] [1|2] [2|3] connect, but 4 and 3 differ
```
