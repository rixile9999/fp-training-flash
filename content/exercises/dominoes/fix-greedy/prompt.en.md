The `can_chain` below decides whether every domino stone can be used exactly once to build a chain that loops all the way around. A report came in that it sometimes returns `False` even though a chain clearly exists. Fix it.

- A stone `#(a, b)` can be flipped and placed as `#(b, a)`. Two neighboring stones must have the same number where they touch.
- The outer number of the first stone must also equal the outer number of the last stone. With no stones, the answer is `True`.
- There may be several stones of the same shape, and each one must be used separately, once.

```gleam
can_chain([#(1, 2), #(2, 3), #(3, 1), #(2, 4), #(2, 4)])
// now:      False
// expected: True    [1|2] [2|4] [4|2] [2|3] [3|1]
```
