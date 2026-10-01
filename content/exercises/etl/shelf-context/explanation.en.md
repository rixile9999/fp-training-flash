One shelf spreads out into several codes, so the basic frame is the same as in the original score table transformation. The outer `dict.fold` goes over each shelf, and the inner `list.fold` over each code on that shelf, adding entries to the result dict.

```gleam
list.fold(codes, index, fn(acc, raw) {
  case normalize(raw) {
    "" -> acc
    code -> dict.insert(acc, code, shelf)
  }
})
```

The key point of this exercise is the order: **clean up first, then decide**. `"   "` is not an empty string before cleanup, but it becomes one once the spaces are removed. If you check the raw value for emptiness and only then clean it up, a `""` key sneaks into the result. Splitting the rule for cleaning up a single code into `normalize` lets "clean up" and "decide whether to skip" flow naturally into a single `case`, and if the cleanup rule changes, you only have to fix one place.

This way of building up a shape-changing transformation from an empty dict is covered in the theory note "The universality of fold" (fold-universality).
