---
id: gleam-list-transform
title: Three ways to transform a list
---
| Function | What it does | Result length |
|---|---|---|
| `list.map(xs, f)` | Applies `f` to every item | Same as the input |
| `list.filter(xs, keep)` | Keeps only the items for which `keep` is `True` | Same or shorter |
| `list.fold(xs, init, f)` | Combines the items, from the left, into a single value | One value |

```gleam
import gleam/list

list.map([1, 2, 3], fn(x) { x * 2 })        // [2, 4, 6]
list.filter([1, 2, 3], fn(x) { x > 1 })     // [2, 3]
list.fold([1, 2, 3], 0, fn(acc, x) { acc + x }) // 6
```

Common mistake: confusing "change only some items" with "keep only some items". To change only some items, branch with `case` inside `map`.
