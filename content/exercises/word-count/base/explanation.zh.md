把问题拆成五个小转换，每一步就只做一件事。

```gleam
input
|> string.lowercase                  // 1. 规范化大小写
|> string.to_graphemes               // 2. 转成字符列表
|> list.map(fn(g) { case is_word_char(g) { True -> g  False -> " " } })
|> string.concat                     //    把所有分隔符统一成一个空格
|> string.split(" ")                 // 3. 拆分
|> list.filter(fn(word) { word != "" })  // 4. 丢掉空片段
|> list.fold(dict.new(), increment)  // 5. 计数
```

- 分隔符有好几种（逗号、冒号、换行等），只用 `string.split(" ")` 拆不开 `"one,two"`。把所有分隔符都换成空格，拆分一次就够了。
- 分隔符连续出现或位于字符串首尾时，`split` 会产生空字符串片段。不把它们过滤掉，`""` 就会被算作单词。这是最常见的错误。
- 把转小写放在最前面，后面所有步骤都只处理小写，`is_word_char` 也只需检查小写字母。

计数是把列表折叠成一个 dict 的 fold。在 `increment` 中使用 `dict.upsert` 和 `option.unwrap(previous, 0) + 1`，就能用同一个表达式处理第一次见到的单词和已经见过的单词。

用管道把小转换连接起来构成整体的方式，在理论笔记 function-composition-pipelines（函数组合与管道）中讨论；把列表折叠成 dict 的方式，在 fold-universality（fold 的普适性）中讨论。
