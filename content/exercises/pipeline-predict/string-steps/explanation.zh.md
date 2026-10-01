答案是 `[6, 5, 5]`。

```gleam
"  Hello, Gleam World  "
|> string.trim             // "Hello, Gleam World"
|> string.lowercase        // "hello, gleam world"
|> string.split(" ")       // ["hello,", "gleam", "world"]
|> list.map(string.length) // [6, 5, 5]
```

因为 `string.trim` 先删除了两端的空白，所以 `split` 的结果中不会出现空字符串。如果调换顺序先执行 `split`，结果中就会混入 `["", "", "Hello,", ...]` 这样的空片段。在管道中，步骤的顺序会改变结果（理论主题“函数组合与管道”）。

常见错误是忘了逗号，把 `"hello"` 的长度算成 5，答成 `[5, 5, 5]`。`split` 只按分隔符（空格）拆分，不会删除标点，所以第一段是 `"hello,"`（6 个字符）。
