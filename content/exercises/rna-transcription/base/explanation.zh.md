转换单个字符的规则有四种成功情况和一种“其他字符一律失败”。把这条规则拆成 `complement(nucleotide) -> Result(String, Nil)` 函数，“可能失败”这一事实就体现在返回类型中，而且可以单独检查规则。

整条链是“所有字符都成功才算成功”。这正是 `list.try_map` 的定义。

```gleam
dna
|> string.to_graphemes
|> list.try_map(complement)      // Result(List(String), Nil)
|> result.map(string.concat)     // Result(String, Nil)
```

`try_map` 遇到第一个 `Error` 就停下并返回这个 `Error`。只有全部成功时，转换后的列表才以 `Ok` 输出，所以最后的拼接用 `result.map` 连接，只在成功时进行。空字符串没有字符，也就没有会失败的字符，结果是 `Ok("")`。

最常见的错误是使用 `list.filter_map`。`filter_map` 会**丢弃**失败的元素、只留下其余的，所以 `"ACGTX"` 会变成 `Ok("UGCA")`，错误输入看起来像是正常的结果。“过滤掉失败”和“报告失败”是完全不同的要求。

先把输入转成大写，也是放宽规则的错误。题目只把四个大写字母定为合法输入，所以小写字母不能悄悄修正，而要作为错误报告。

用结果类型报告错误输入的设计，在理论笔记“错误也是值”（errors-as-values）中有更多介绍。
