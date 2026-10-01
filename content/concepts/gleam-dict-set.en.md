---
id: gleam-dict-set
title: Dict and Set
---
`Dict(k, v)` is an immutable map that looks values up by key, and `Set(a)` is a collection of values with no duplicates. Every operation
leaves the original untouched and returns a **new** Dict or Set.

| Function | What it does |
|---|---|
| `dict.new()`, `dict.from_list([#(k, v)])` | Create one (if a key appears more than once, the last value wins) |
| `dict.insert(d, k, v)` | Add a key or overwrite it |
| `dict.get(d, k)` | `Ok(v)` or `Error(Nil)` |
| `dict.upsert(d, k, fn(Option(v)) -> v)` | Decide the new value from the existing one (`Some` if there is one) |
| `dict.delete(d, k)`, `dict.has_key(d, k)`, `dict.size(d)` | Delete, check, count |
| `dict.to_list(d)`, `dict.keys(d)`, `dict.fold(d, acc, f)` | Get the contents out (no guaranteed order) |
| `set.from_list(xs)`, `set.insert(s, x)`, `set.contains(s, x)` | Create, add, check membership |
| `set.union`, `set.intersection`, `set.difference` | Union, intersection, difference |

```gleam
import gleam/dict.{type Dict}
import gleam/list
import gleam/option.{None, Some}
import gleam/set

pub fn count_words(words: List(String)) -> Dict(String, Int) {
  list.fold(words, dict.new(), fn(counts, word) {
    dict.upsert(counts, word, fn(existing) {
      case existing {
        Some(n) -> n + 1
        None -> 1
      }
    })
  })
}
// dict.get(count_words(["a", "b", "a"]), "a") == Ok(2)

pub fn tag_count() -> Int {
  set.from_list(["sale", "new", "sale"]) |> set.size   // 2
}
```

Common mistake: relying on the order of `dict.to_list`, `dict.keys` or `set.to_list`. That order is not defined, so when you return the
result as a list, sort it with `list.sort` first.
