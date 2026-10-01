---
id: gleam-use-expressions
title: use expressions
---
`use` is syntax that lets you write calls to functions taking a callback as their last argument without nesting. **Everything after**
`use x <- f(a)` in the block becomes a callback `fn(x) { ... }`, and Gleam calls `f(a, callback)`.

| Written with `use` | Written out in full |
|---|---|
| `use x <- result.try(r)` + rest | `result.try(r, fn(x) { rest })` |
| `use x <- option.then(o)` + rest | `option.then(o, fn(x) { rest })` |
| `use <- bool.guard(when: c, return: v)` + rest | `bool.guard(c, v, fn() { rest })` |

```gleam
import gleam/bool
import gleam/int
import gleam/result

pub fn total_price(qty_text: String, price_text: String) -> Result(Int, Nil) {
  use qty <- result.try(int.parse(qty_text))
  use price <- result.try(int.parse(price_text))
  Ok(qty * price)
}
// total_price("3", "1500") == Ok(4500), total_price("x", "1500") == Error(Nil)

pub fn withdraw(balance: Int, amount: Int) -> Result(Int, String) {
  use <- bool.guard(when: amount <= 0, return: Error("amount must be positive"))
  use <- bool.guard(when: amount > balance, return: Error("insufficient balance"))
  Ok(balance - amount)
}
```

With `result.try`, the flow "if an earlier step is an `Error`, stop right there and return that error" reads one line at a time.
`bool.guard` gives you check lines that return early when a condition holds. To narrow the scope of a `use`, wrap it in a `{ ... }` block.

Common mistake: not wrapping the last expression in `Ok(...)`. The last expression is the callback's return value, so a block chained
with `result.try` must return a Result: `Ok(qty * price)`, not `qty * price`.
