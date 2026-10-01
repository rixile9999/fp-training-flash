The bug is `dict.insert(counts, word, 1)` in `increment`. `dict.insert` **overwrites** the value if the key already exists, so no matter how many times you meet the same word, its count goes back to 1.

What you need is an update that "decides the new value by looking at the existing one". `dict.upsert` hands you the existing value as an `Option`, so you can split the two cases with `case`.

```gleam
dict.upsert(counts, word, fn(previous) {
  case previous {
    Some(count) -> count + 1
    None -> 1
  }
})
```

Writing it in one line as `option.unwrap(previous, 0) + 1` works the same. In that case, the default must be 0. If you write `None -> 0`, a word seen for the first time starts at 0, and every count comes up one short.

One more thing to watch: you must update `counts`, the accumulator that fold hands you. If you insert into `dict.new()` each time, only the last word is left. A single fold step is the rule "result so far + one element -> new result", and this view is covered in the theory note fold-universality (The universality of fold).
