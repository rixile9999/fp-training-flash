---
id: total-vs-partial-functions
title: Total and partial functions
---
A **total function** returns a value of its result type for every input of its parameter types. A **partial function** fails to return a value for some inputs: it either stops execution (`panic`, a failing `let assert`) or never finishes.

If a function with the signature `fn(List(Int)) -> Int` panics on the empty list, the type says "give me any list and I'll give you an integer", but that's actually false. The caller can't see this risk from the signature, and the compiler can't help either. There are two ways to turn a partial function into a total one.

**1. Widen the result.** Make the possibility of having no value visible in the result type. That's why `list.first` in the standard library returns `Result(a, Nil)`.

```gleam
import gleam/int
import gleam/list

pub fn average(xs: List(Int)) -> Result(Int, Nil) {
  case xs {
    [] -> Error(Nil)
    _ -> Ok(int.sum(xs) / list.length(xs))
  }
}
```

Now the caller can't get the average out without handling `Error`. The possibility of failure propagates along with the type.

**2. Narrow the input.** Accept a type in which the problematic input can't be constructed in the first place. If you express a non-empty list as a type, a maximum always exists.

```gleam
import gleam/int
import gleam/list

pub type NonEmpty(a) {
  NonEmpty(first: a, rest: List(a))
}

pub fn maximum(xs: NonEmpty(Int)) -> Int {
  list.fold(xs.rest, xs.first, int.max)
}
```

Narrowing the input gathers the check in one place (the boundary where the value is created). Validate once at the boundary with a `Result` to build a `NonEmpty`, and the functions after that don't need to repeat the same check.

## Watch out for silent defaults too

Gleam's integer division `/` returns 0 instead of an error when you divide by 0 (float division `/.` also returns 0.0). The function becomes total, but you can no longer tell "divided by zero" from "the real result is 0". If the failure is meaningful, it's better to return a `Result`, as `int.divide` does. Covering up an error with an arbitrary default doesn't make a function total; it hides the failure.

Use `let assert` and `panic` only when the invariant "this case can never happen" is already guaranteed by the code. Values that come in at the boundary, such as user input, file contents and external responses, can always be wrong, so handle them with `Result`.

## Where this concept is used

- Deciding the return type of operations that "might have no value", such as an empty list, a missing key, division by zero or a parse failure.
- Refactoring `let assert` into `case` or `Result`.
- Representing validated values as dedicated types to narrow the input of later functions.
