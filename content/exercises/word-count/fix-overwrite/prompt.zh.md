`tally` 是统计以空格分隔的单词出现次数的函数。可是无论输入什么句子，所有单词的次数都是 1。请修复这个 bug。

- `tally(input)`：转成小写并按空格拆分，对每个单词应用 `increment`，生成 `Dict(String, Int)`。（这个函数不需要修改）
- `increment(counts, word)`：`word` 已存在时次数加 1，不存在时以 1 加入。其他单词的次数保持不变。

```gleam
tally("fish one fish two fish")
// 期望：dict.from_list([#("fish", 3), #("one", 1), #("two", 1)])
// 实际：dict.from_list([#("fish", 1), #("one", 1), #("two", 1)])
```
