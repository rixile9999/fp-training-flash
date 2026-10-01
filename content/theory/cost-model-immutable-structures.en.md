---
id: cost-model-immutable-structures
title: The cost model of immutable data structures
---
Immutable values can't be changed, so "modifying" one means building a new value. The new value rebuilds only the parts that changed and shares the rest with the original. That's why the cost of functional code mostly comes down to two questions.

- **How far into the structure** does this operation have to walk?
- **How many cells** does this operation have to build anew?

## A list is a singly linked list

Gleam's `List(a)` is a chain of cells, each holding "the first element + a pointer to the rest of the list". The front is cheap and the back is expensive.

| Operation | Cost | Why |
|---|---|---|
| `[x, ..xs]` prepend | O(1) | One new cell points to the existing `xs` |
| `[first, ..rest]` pattern match | O(1) | Looks only at the first cell |
| `list.length(xs)` | O(n) | The length isn't stored, so it counts to the end |
| `list.append(xs, ys)` | O(length of `xs`) | Copies every cell of `xs` and shares `ys` |
| `list.reverse(xs)` | O(n) | Builds every cell anew |
| `list.last(xs)`, i-th element | O(n), O(i) | Must walk from the front |
| `list.contains(xs, x)` | O(n) | Compares one by one |

## Dict and Set

`Dict` is built on Erlang's map. With n keys, think of lookup and insertion as roughly O(log n), far cheaper than the O(n) of scanning a list. `dict.insert` leaves the original dict untouched and returns a new dict that shares most of it. `dict.size` is constant time, O(1). `Set` from `gleam/set` is a `Dict` inside, so it has the same costs.

## Strings

On Erlang, strings are UTF-8 binaries. `string.length` has to count the characters a person sees (graphemes), so it is O(n). Functions that build a list of characters, like `string.to_graphemes`, also scan the whole string. Don't re-measure the length of the same string on every pass of a loop.

## Common traps

Doing an O(n) operation n times inside a loop gives O(n²). Most performance problems have this shape.

1. Using `list.length(xs) == 0` to check for emptiness. The `[]` pattern or `list.is_empty` is O(1).
2. Appending at the end inside a loop with `list.append(acc, [x])`. Prepend instead, and reverse once at the end.
3. Using `list.contains` or accessing the i-th element inside a loop. If you look things up often, switch to a `Set` or a `Dict`.
4. Building a queue from one list and adding at the back. Every push is O(n). Use a queue made of two lists.
5. Making the same recursive call with the same arguments several times. Bind the result once with `let` and reuse it; if many subproblems overlap, switch to dynamic programming.

```gleam
import gleam/list
import gleam/set

// O(n * m): scans the whole blocked list for every order
pub fn blocked_orders_slow(
  order_ids: List(Int),
  blocked: List(Int),
) -> List(Int) {
  list.filter(order_ids, fn(id) { list.contains(blocked, id) })
}

// Turn the blocked list into a Set once, then look up. One lookup is about O(log m)
pub fn blocked_orders(order_ids: List(Int), blocked: List(Int)) -> List(Int) {
  let blocked_set = set.from_list(blocked)
  list.filter(order_ids, fn(id) { set.contains(blocked_set, id) })
}
```

## How to count cost

Big-O notation describes the **shape** of how the work grows as the input grows. When n grows 10 times, O(n) grows 10 times, O(n log n) a little more than 10 times, and O(n²) 100 times. On small inputs you can't see the difference; on large inputs the gap widens sharply.

This platform's performance checks compare the units of work the BEAM counts (reductions, a count of function calls and similar work) instead of running time. They aren't affected by the machine's load, so differences in complexity show up clearly.

## Where this concept is used

- Performance checks in algorithm exercises. A solution one complexity class worse than intended exceeds the limit on large inputs.
- To build a list, prepend and reverse; for frequent lookups, use `Dict` or `Set`; for a queue, use two lists.
- Choosing whether a dynamic programming table should be a `Dict` or whether to carry only the previous row as a list.
