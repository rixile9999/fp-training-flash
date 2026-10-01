输入的一个条目（一个分数）在结果中会展开成多个条目（字母有几个就有几个）。这是改变形状的转换，所以无法用 `dict.map_values` 这类保持结构的操作来完成，应该用 fold：从空 dict 开始，一个一个地添加条目。

```gleam
dict.fold(legacy, dict.new(), fn(result, score, letters) {
  list.fold(letters, result, fn(acc, letter) {
    dict.insert(acc, string.lowercase(letter), score)
  })
})
```

外层 fold 遍历每个分数，内层 fold 遍历该分数下的每个字母。关键在于内层 fold 的初始值是外层的累加器 `result`。如果从新的 dict 开始，前面分数插入的字母就会丢失。对于空列表，内层 fold 一次也不会执行，因此不需要单独处理。

常见错误是漏掉小写转换，或者像 `case letters { [first, ..] -> ... }` 那样只插入列表的第一个字母。

“保持形状的转换用 map，改变形状并累积出新值的转换用 fold”这一区分，在理论笔记“保持结构的变换：函子”和“fold 的普适性”（fold-universality）中有更多讨论。
