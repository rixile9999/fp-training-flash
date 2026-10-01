---
id: immutability-structural-sharing
title: Immutable values and structural sharing
---
Once a value in Gleam is created, it never changes. Operations that add an item to a list or change a field of a record don't modify the original value; they return a **new value**. Whoever holds the original keeps seeing the same value.

Building a new value every time sounds slow, but it's usually cheap, because the parts that didn't change are **shared**, not copied. Prepending an item to a list with `[x, ..xs]` builds just one new cell and points to all of `xs` as is.

```gleam
pub fn shared_tails() -> #(List(Int), List(Int), List(Int)) {
  let base = [2, 3]
  let a = [1, ..base]
  let b = [9, ..base]
  #(base, a, b)
}
```

`a` and `b` share the same `base` as their tail. Nobody can change `base`, so sharing it is safe. With mutable lists, a change on one side would leak into the other, so you would have had to copy defensively.

Record updates work the same way. `Order(..order, amount: 0)` builds one new record with a few fields, and the fields that didn't change (for example, a long `items` list) point to the same values instead of being copied.

```gleam
pub type Order {
  Order(id: Int, items: List(String), amount: Int)
}

pub fn clear_amount(order: Order) -> Order {
  Order(..order, amount: 0)
}
```

## When it costs something

Sharing works when "the part that didn't change" is at the **tail end** of the new value. Appending to the end of a list with `list.append(xs, [x])` has to rebuild every cell of `xs`, so it is O(n). Appending one at a time, as in a loop, makes the total O(n²). That's why functional code collects items by prepending and calls `list.reverse` once at the end.

## What immutability gives you

- **Local reasoning**: when you pass a value to a function, that function can't change your value. In tests, you don't have to worry whether the original input is still intact after the call.
- **Previous versions remain**: you can hold the value before and after an update at the same time, which makes comparison, undo and keeping history easy.
- **Sharing is safe**: even if many places hold the same value, nobody can change it, so you need no defensive copies or locks.

A common mistake is the illusion that "I updated it but the change didn't stick". If you call `clear_amount(order)` and discard the return value, nothing happens. You must always bind the new value to a variable or pass it on to the next step.

## Where this concept is used

- Building a new value with only some fields changed, using record update syntax.
- Choosing the pattern of prepending and reversing at the end when building a list.
- Designing persistent data structures, where the core idea is to rebuild only the updated part and share the rest.
