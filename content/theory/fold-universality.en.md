---
id: fold-universality
title: 'The universality of fold: the common skeleton of list recursion'
---
Almost every recursive function that walks a list to the end has the same shape. There is a value `v` to return for the empty list, and for `[x, ..rest]` a function `f` combines `x` with the result of processing `rest`.

```text
g([])          = v
g([x, ..rest]) = f(g(rest), x)
```

`list.fold_right(xs, v, f)` is exactly this shape, implemented once. The **universal property** says the relationship goes both ways: if a function `g` satisfies the two equations above, then `g` must be the same as `fold_right(_, v, f)`. So any function defined by "an empty case + combining one cell at a time", such as a sum, the length, `map` or `filter`, can be written as a fold. And if you show that two functions satisfy the two equations with the same `v` and `f`, you can conclude they are equal without writing a new induction proof, because induction was already used once to prove the universal property.

```gleam
import gleam/list

pub fn map_via_fold(xs: List(a), f: fn(a) -> b) -> List(b) {
  list.fold_right(xs, [], fn(acc, x) { [f(x), ..acc] })
}

pub fn filter_via_fold(xs: List(a), keep: fn(a) -> Bool) -> List(a) {
  list.fold_right(xs, [], fn(acc, x) {
    case keep(x) {
      True -> [x, ..acc]
      False -> acc
    }
  })
}
```

Thinking in folds reduces a problem to two questions: "What is the answer for the empty input?" and "Given the answer for the rest, how do I add one item?" Once those two are settled, you don't need to write the traversal yourself. Make the accumulator a tuple and you can compute several results, such as a total and a count, in a single pass.

## Left fold and right fold

Gleam's `list.fold` accumulates from the left and is tail-recursive; `list.fold_right` combines from the right and is not tail-recursive. Both pass arguments to the callback in the order `fn(acc, x)`, so the only difference is the order in which items are visited. For operations that are both commutative and associative (`+`, `int.max`), the result is the same in either direction. For operations where order matters, such as joining strings or building lists, the direction changes the result.

```gleam
import gleam/list

pub fn reverse_via_fold(xs: List(a)) -> List(a) {
  list.fold(xs, [], fn(acc, x) { [x, ..acc] })
}
```

Building `[x, ..acc]` with `list.fold` reverses the order. A common mistake is to forget this and return the result as is. If order must be preserved, call `list.reverse` once at the end or use `fold_right`. On the BEAM, the stack of body recursion also grows as needed, so `fold_right` doesn't overflow on long lists. When building lists, the two approaches are usually about the same in speed and memory (see Accumulators and tail recursion), so pick whichever reads more clearly.

## Where this concept is used

- A computation that applies a list of events in turn to build a final state is a fold, with the initial state as `v` and applying an event as `f`.
- To get a total, a count and a maximum at once, use a tuple or a record as the accumulator.
- When you spot that a hand-written recursive function has the shape of a fold, you can replace it with `list.fold` or `list.map` to make it shorter and safer.
