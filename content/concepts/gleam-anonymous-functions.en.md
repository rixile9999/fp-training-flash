---
id: gleam-anonymous-functions
title: Anonymous functions and function capture
---
In Gleam, functions are values. You can create one on the spot without giving it a name, or pass an existing function along as is.

| Syntax | Example | Meaning |
|---|---|---|
| Anonymous function | `fn(x) { x * 2 }` | Takes an argument `x` and returns `x * 2` |
| Type annotations | `fn(x: Int) -> Int { x * 2 }` | The same, with the argument and return types written out |
| Function reference | `int.to_string` | Passes an existing function as a value |
| Capture | `int.add(_, 10)` | Shorthand for `fn(x) { int.add(x, 10) }` |
| Closure | `fn(p) { p * rate }` | Remembers the outer variable `rate` |
| Function type | `fn(Int) -> Int` | The type you write when a function takes or returns a function |

```gleam
import gleam/int
import gleam/list

pub fn multiplier(n: Int) -> fn(Int) -> Int {
  fn(x) { x * n }
}

pub fn examples() {
  let rate = 10
  let discount = fn(price) { price - price * rate / 100 }
  list.map([1000, 2000], discount)    // [900, 1800]
  list.map([1, 2], int.to_string)     // ["1", "2"]
  list.map([1, 2], int.add(_, 10))    // [11, 12]
  list.map([1, 2], multiplier(3))     // [3, 6]
}
```

If you build a function from a setting, as `multiplier(3)` does, you can hand the same rule to many places and reuse it.

Common mistake: trying to build a multi-step calculation with the capture `_`. A capture turns **a single call** into a function, nothing more.
`int.add(_, 1) * 2` is not "a function that adds 1 and then multiplies by 2": it multiplies a function by 2, which is a type error.
Leaving two holes, as in `int.add(_, _)`, doesn't compile either. If it's more than one call, write it out: `fn(x) { int.add(x, 1) * 2 }`.
