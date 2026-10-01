`list.filter_map(complement)` 会**丢弃** `complement` 返回 `Error` 的字符，只收集其余的。之后又无条件用 `Ok` 包裹，所以无论输入是什么，结果都是 `Ok`。“存在错误字符”这一事实消失了，调用方会把变短的序列当作正确结果。

修复后的代码使用表示“全部成功才算成功”的 `list.try_map`，并且只在成功时用 `result.map` 拼接。

```gleam
dna
|> string.to_graphemes
|> list.try_map(complement)
|> result.map(string.concat)
```

修复时也容易出现一些错误的改法。

- 结果为空字符串时改成 `Error`：只能抓住所有字符都错误的情况，仍会漏掉部分字符错误的情况。而且合法的空输入 `""` 也会变成错误。不要根据结果去猜测失败，而要在失败发生的地方就把它传递出去。
- 用 `result.unwrap(complement(c), c)` 保留错误字符：长度是对的，但 `"ACXT"` 会看起来像 `Ok("UGXA")`，错误被藏进了结果里。

`filter_map`、`unwrap` 这类吸收失败的函数，只在需求明确“可以忽略失败的元素”时使用。用结果类型传递失败的设计，在理论笔记“错误也是值”（errors-as-values）中有更多介绍。
