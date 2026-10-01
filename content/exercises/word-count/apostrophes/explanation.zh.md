单引号有两种作用。`don't` 中的单引号是单词的一部分，`'large'` 中的单引号则是引号。只看字符本身无法区分，但可以通过**位置**区分：在单词中间的是缩写，在片段最前面或最后面的是引号。

所以把处理分成两步。

1. `tokens`：把单引号当作单词字符，只按其余分隔符拆分。在这一步，`'can't'` 仍是一个片段。
2. `trim_quotes`：只去掉片段首尾的单引号。

```gleam
token
|> string.to_graphemes
|> list.drop_while(fn(g) { g == "'" })   // 去掉前面的引号
|> list.reverse
|> list.drop_while(fn(g) { g == "'" })   // 去掉后面的引号
|> list.reverse
|> string.concat
```

像单个 `'` 或 `''` 这样只有引号的片段，整理后会变成空字符串，所以计数前要再过滤一次。常见错误有两种。

- 一开始就把单引号当作分隔符，导致 `don't` 被拆成 `don` 和 `t`。
- 不去掉首尾的引号，导致 `'large'` 和 `large` 被算作不同的单词。

把问题拆成“拆分”和“整理片段”这两个独立的小函数，就能分别测试，`count_words` 则成为把它们连接起来的管道。这种组合方式在理论笔记 function-composition-pipelines（函数组合与管道）中讨论，最后的计数步骤在 fold-universality（fold 的普适性）中讨论。
