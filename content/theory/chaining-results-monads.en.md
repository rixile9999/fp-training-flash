---
id: chaining-results-monads
title: Chaining Results and monads
---
You often need to chain several steps that can each fail: parse a quantity, parse a price, check a limit. Written directly with `case`, each step indents one level deeper, and every level repeats the same code: "if it's an `Error`, return it as is".

`result.try` is that repeated part pulled out into a function.

```text
result.try(Result(a, e), fn(a) -> Result(b, e)) -> Result(b, e)
```

If the first result is `Ok(x)`, it passes `x` to the next step. If it is `Error(e)`, it skips the next step and returns `Error(e)` unchanged (short-circuiting). With a `use` expression, the rest of the block becomes the callback, so the code reads flat.

```gleam
import gleam/int
import gleam/result

pub type OrderError {
  BadQuantity(String)
  BadPrice(String)
  OverLimit(Int)
}

pub fn order_total(quantity: String, price: String) -> Result(Int, OrderError) {
  use q <- result.try(
    int.parse(quantity) |> result.replace_error(BadQuantity(quantity)),
  )
  use p <- result.try(int.parse(price) |> result.replace_error(BadPrice(price)))
  check_limit(q * p)
}

fn check_limit(amount: Int) -> Result(Int, OrderError) {
  case amount > 1_000_000 {
    True -> Error(OverLimit(amount))
    False -> Ok(amount)
  }
}
```

The lines after `use p <- result.try(r)` are the same as the function body in `result.try(r, fn(p) { ... })`. Only the syntax changes; the code is still a nested callback.

## Why it's a monad

For `Result(_, e)` with the error type `e` fixed, wrapping a value with `Ok` and `result.try` are the two monad operations (return and bind), and they satisfy three laws.

- Left identity: `result.try(Ok(x), f)` is the same as `f(x)`.
- Right identity: `result.try(r, Ok)` is the same as `r`.
- Associativity: `result.try(result.try(r, f), g)` is the same as `result.try(r, fn(x) { result.try(f(x), g) })`.

The laws are what justify refactoring. Thanks to associativity, you can pull some of the chained steps out into a separately named function, or inline them again, without changing the meaning. The identity laws say that a step that only wraps the result in `Ok` at the end does nothing.

## map versus try, and matching error types

If the next step can't fail, use `result.map`; if it can fail (returns a `Result`), use `result.try`. Passing a function that returns a `Result` to `map` gives you a nested type like `Result(Result(b, e), e)`. This is the most common mistake.

Every step must share the same error type. For functions like `int.parse` that return a `Nil` error, convert it into a domain error with `result.replace_error` or `result.map_error` before chaining.

`result.try` stops at the **first** error. If you need to show errors for all input fields at once, you need a different structure that runs each check independently and collects the errors in a list.

## Where this concept is used

- Chaining steps that can fail in sequence, such as parsing, validation, lookup and calculation.
- Refactoring a pyramid of nested `case` expressions into flat code with `use` and `result.try`.
- `option.then` for `Option` has the same shape: it stops when there is no value and passes the value on when there is one.
