---
id: algebraic-data-types
title: Sum types and exhaustive matching
---
Types are built from two ways of combining values.

- **Product type**: holds **all** of several values. `Order(id: Int, status: Status, amount: Int)` holds three fields at once.
- **Sum type**: is **exactly one** of several cases. A `Status` is one of `Pending`, `Shipped` or `Cancelled`.

A type built by combining the two is called an algebraic data type. Count the possible values and the name makes sense: a product type multiplies the number of possibilities of each field, and a sum type adds them.

```gleam
pub type Status {
  Pending
  Shipped
  Cancelled
}

fn label(status: Status) -> String {
  case status {
    Pending -> "Awaiting shipment"
    Shipped -> "Shipped"
    Cancelled -> "Cancelled"
  }
}
```

The Gleam compiler checks that a `case` covers every case of a sum type. When a new status is added, it reports the missing branch as a compile error. Catching everything else with `_ ->` amounts to switching this check off yourself.

## Where this concept is used

- When processing depends on the state, spell out every case with `case`.
- `Option(a)` and `Result(a, e)` are sum types too. They are the basis for expressing failure in types.
