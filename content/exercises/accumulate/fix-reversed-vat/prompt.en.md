A bug report came in: in the price list module, `with_vat` returns the prices in reverse order. Find the cause of the bug and fix it.

- `accumulate(items, fun)`: returns a new list with `fun` applied to each element. The order and length must match the input. It is a shared function that other modules use too.
- `with_vat(prices)`: adds 10% VAT to each price. Integer division drops anything below 1 won.
- Do not use `list.map`. Keep the existing tail-recursive structure.

```gleam
with_vat([1000, 2500, 300])
// expected: [1100, 2750, 330]
// actual:   [330, 2750, 1100]
```
