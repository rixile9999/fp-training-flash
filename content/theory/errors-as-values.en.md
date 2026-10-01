---
id: errors-as-values
title: Errors are values too
---
Gleam has no exceptions for expected failures. A function that can fail returns `Result(a, e)`, and a failure becomes an **ordinary value**, `Error(e)`. Three benefits follow from this choice.

- **Honest signatures**: the return type alone tells you whether a function can fail and how.
- **You can't forget to handle it**: to use the `Int` inside a `Result(Int, e)`, you have to take it out with `case` or a function from the `result` module. Ignore the failure path and the types don't line up.
- **You can work with errors**: they are values, so you can compare them, pattern match on them, collect them in a list, and check them in tests with `should.equal`.

## Designing error types

For an error value to be useful, it must have a shape the caller **can branch on**. The default is a sum type with one constructor per reason for failure.

```gleam
import gleam/int

pub type QuantityError {
  NotANumber(input: String)
  NotPositive(value: Int)
}

pub fn parse_quantity(input: String) -> Result(Int, QuantityError) {
  case int.parse(input) {
    Error(Nil) -> Error(NotANumber(input))
    Ok(n) if n <= 0 -> Error(NotPositive(n))
    Ok(n) -> Ok(n)
  }
}
```

The caller can react differently to each reason, and the compiler checks that every constructor is handled.

```gleam
pub fn message(input: String) -> String {
  case parse_quantity(input) {
    Ok(n) -> "Added " <> int.to_string(n) <> " to your cart"
    Error(NotANumber(_)) -> "Please enter a number"
    Error(NotPositive(_)) -> "Please enter 1 or more"
  }
}
```

If there is only one reason for failure, `Result(a, Nil)` is enough (`int.parse`, `list.first`). If there are several reasons and you lump them into `Nil` or `String`, information is lost. `String` errors read well for people, but the caller has to branch by comparing strings, which is fragile. Write the wording at the outermost layer, based on the error value.

## Common mistakes

- Swallowing an error by turning it into a default value, as in `result.unwrap(r, 0)`. The fact that something failed disappears, and 0 flows on as if it were a normal result.
- Returning the same constructor for failures with different reasons. Tests check **which** error it is, as in `Error(NotPositive(0))`.
- Using `panic` or `let assert` for expected input errors.

The BEAM's "let it crash" philosophy doesn't conflict with this. That is a strategy for restarting a process when there is a bug or an unexpected state. A quantity the user typed wrong is an expected outcome, so it is returned as a value.

## Where this concept is used

- Deciding the return type of input parsing and validation functions.
- Gathering failures from several steps into one error type and chaining them with `result.try` (see Chaining Results and monads).
- Producing a different message or HTTP status for each kind of error.
