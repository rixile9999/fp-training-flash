---
id: higher-order-modularity
title: Higher-order functions and modularity
---
How well you can split a program depends on how powerful your ways of **gluing the pieces back together** are. Hughes named two powerful kinds of glue that functional languages provide: higher-order functions and lazy evaluation. Gleam is an eagerly evaluated language, so it doesn't give you the second kind by default, but you can use the first as is.

A higher-order function is a function that takes functions as arguments or returns a function. The key idea is **separating control structure from decisions**. `list.map`, `list.filter` and `list.fold` implement "how to walk a list" once, and the caller passes "what to decide at each item" as a function. The traversal code, once verified, keeps getting reused, and the only new code you write is a single business rule.

Returning functions has the same effect. If you build rule functions from configuration values, you can put the rules in a list and combine them like data.

```gleam
import gleam/int
import gleam/list

pub type Rule =
  fn(Int) -> Int

pub fn percent_off(percent: Int) -> Rule {
  fn(amount) { amount - amount * percent / 100 }
}

pub fn flat_off(value: Int) -> Rule {
  fn(amount) { int.max(0, amount - value) }
}

pub fn apply_all(amount: Int, rules: List(Rule)) -> Int {
  list.fold(rules, amount, fn(acc, rule) { rule(acc) })
}
```

`apply_all(10_000, [percent_off(10), flat_off(1000)])` is 8000. The function returned by `percent_off` is a closure that remembers the value of `percent`. Adding a new kind of discount doesn't change `apply_all`, and changing the order of application only means changing the order of the list. Each rule can be tested separately, and for `apply_all` you only test one property: "it applies the rules in order".

## A criterion for modularity

Parnas's criterion for splitting modules was to "hide each decision that is likely to change in one place". Higher-order functions put this principle into practice at the level of functions. What changes often (discount rules, sort criteria, filter conditions) is passed in as an argument, and what rarely changes (traversal, accumulation, preserving order) stays inside the higher-order function. `list.sort(xs, by: compare)` separating the sorting algorithm from the comparison criterion is the same structure.

## When not to abstract

Pull a decision out into a function argument when two or more pieces of code **differ in only one decision** and are otherwise the same. Adding function parameters in advance when there is only one call site just complicates the signature, and readers have to go hunting for the function actually passed in. The common mistake goes the other way: copying almost identical traversal code several times with only the condition changed. When you fix one copy, it's easy to forget the others.

## Where this concept is used

- Expressing frequently added policies, such as pricing, discount and validation rules, as a list of functions.
- Letting the caller decide the sort criterion, filter condition or aggregation method.
- Refactoring repeated recursive code into existing higher-order functions such as `list.map` and `list.fold`.
