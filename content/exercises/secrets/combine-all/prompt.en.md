The encryption device now receives a multi-step operation as a list of settings. `secret_add`, `secret_subtract`, `secret_multiply`, `secret_divide` and `secret_combine` are already implemented in the starter code. Add two functions.

1. `secret_combine_all(fns: List(fn(Int) -> Int)) -> fn(Int) -> Int`
   - Return a function that applies the functions in order, **starting from the first function** in the list.
   - For an empty list, return a function that returns its input unchanged.
2. `secret_repeat(f: fn(Int) -> Int, times: Int) -> fn(Int) -> Int`
   - Return a function that applies `f` `times` times in a row.
   - If `times` is 0 or less, return a function that returns its input unchanged.

Reuse the existing `secret_combine` and `secret_combine_all` where you can.

```gleam
let f = secret_combine_all([secret_add(2), secret_multiply(10), secret_subtract(1)])
f(1)   // -> 29  ((1 + 2) * 10 - 1)

let g = secret_repeat(secret_multiply(2), 3)
g(1)   // -> 8
```
