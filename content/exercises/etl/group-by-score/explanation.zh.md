每个字母块都要**加入**某个分数组，所以要做的事取决于这个分数键是否已经存在。`dict.upsert` 恰好把这两种情况分成 `Some(已有列表)` 和 `None` 交给你。

```gleam
scores
|> dict.fold(dict.new(), fn(groups, letter, score) {
  dict.upsert(groups, score, fn(existing) {
    case existing {
      Some(letters) -> [string.uppercase(letter), ..letters]
      None -> [string.uppercase(letter)]
    }
  })
})
|> dict.map_values(fn(_score, letters) { list.sort(letters, string.compare) })
```

分成两步是有原因的。语言并不保证 fold 一个 dict 的顺序，所以收集阶段得到的列表顺序近乎偶然。因此在收集完成后，对每个组显式排序。第二步不改变键和组的数量，只改变值，所以是 `dict.map_values`，即保持结构的 map（“保持结构的变换：函子”）。第一步是一边改变形状一边累积值的 fold（fold-universality）。

常见错误有两种。

- 用 `dict.insert(groups, score, [letter])` 覆盖已有的组，结果每个分数只剩一个字母块。
- 漏掉排序，让 dict 的遍历顺序直接暴露在结果中。尤其是用 `list.append` 往后追加时，在小输入上看起来是对的。这是因为在 BEAM 上，键不超过 32 个的小 dict 出于实现细节恰好按键的顺序遍历。这并不是语言承诺的行为。加入双字母块、键数变成 36 个后，遍历顺序就变成哈希顺序，没有排序的组会立刻被打乱。
