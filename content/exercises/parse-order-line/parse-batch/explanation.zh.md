参考解是一个四步管道：拆分成行 → 标上行号 → 过滤空行 → 逐行解析。

**标行号和过滤的顺序很重要。** 行号必须以原文件为准，所以要在过滤之前用 `list.index_map` 构造 `#(行号, 行)` 对。如果过滤之后再标行号，空行之后所有行的行号都会错位。

最后一步的 `list.try_map` 是“每行的解析都可能失败的 map”。所有行都是 `Ok` 时，得到按顺序收集值的 `Ok(列表)`；一旦出现 `Error` 就在那里停下。这种把 `List(Result(a, e))` 翻转成 `Result(List(a), e)` 的形状，就是 **串联 Result 与单子（chaining-results-monads）** 主题中讲的遍历（traverse）。

`parse_line` 给出的 `ParseError` 里没有行号。用 `result.map_error(LineError(line_number, _))` 给错误补上上下文，就能在不丢弃底层错误的前提下，把它包装成上层的错误类型（**错误也是值** 主题）。调用方只看 `LineError(3, InvalidOrderId("x"))`，就知道是第几行的哪个字段错了。

常见错误：

- 先过滤空行再标行号，导致行号错位。
- 直接使用 `index`，从 0 开始计数。
- 不过滤空行，文件末尾的换行符导致 `WrongFieldCount(1)` 错误。
