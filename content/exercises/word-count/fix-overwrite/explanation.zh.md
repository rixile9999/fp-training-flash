bug 是 `increment` 中的 `dict.insert(counts, word, 1)`。键已存在时 `dict.insert` 会**覆盖**值，所以同一个单词无论遇到多少次，次数都会回到 1。

需要的是“根据已有的值决定新值”的更新。`dict.upsert` 会以 `Option` 的形式把已有值交给你，所以可以用 `case` 区分两种情况。

```gleam
dict.upsert(counts, word, fn(previous) {
  case previous {
    Some(count) -> count + 1
    None -> 1
  }
})
```

也可以写成一行 `option.unwrap(previous, 0) + 1`，效果相同。这时默认值必须是 0。如果写成 `None -> 0`，第一次出现的单词会从 0 开始，所有次数都会少一。

还有一点要注意：必须更新 fold 交给你的累加器 `counts`。如果每次都放进 `dict.new()`，最后只会剩下一个单词。fold 的一步就是“到目前为止的结果 + 一个元素 -> 新结果”这条规则，这一观点在理论笔记 fold-universality（fold 的普适性）中讨论。
