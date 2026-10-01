解析一行就是“拆分字段 → 订单号 → 商品编码 → 数量”这一连串步骤，而每一步都可能失败。参考解把这个结构原样写成代码。

1. 用 `string.split` 和 `list.map(string.trim)` 得到字段，再用 `case` 的 `[a, b, c]` 模式检查个数。个数不对的情况都归到一个兜底模式里，返回 `WrongFieldCount(list.length(fields))`。
2. 为每个字段写一个返回 `Result(值, ParseError)` 的小函数（`parse_order_id`、`parse_sku`、`parse_quantity`）。`int.parse` 只给出 `Error(Nil)`，不说明失败原因，所以用 `result.replace_error` 把它换成本题的错误。
3. 用 `use x <- result.try(...)` 串联三个结果。前一步是 `Error` 时后面的步骤不会执行，所以“只返回第一个错误”自然就成立了。

没有 `use` 的话，`case` 会嵌套三层。`result.try` 是“成功就把值传给下一个计算，失败就原样传下去”的串联规则，这正是 **串联 Result 与单子（chaining-results-monads）** 这一主题的内容。把错误定义成 `ParseError` 这个自定义类型，调用方就能用 `case` 按原因分别处理（**错误也是值**、**和类型与穷尽匹配** 主题）。

常见错误：

- 忘了去掉空白，导致 `int.parse` 拒绝 `" 3"`。
- 只确认 `int.parse` 成功，却漏掉 `数量 >= 1` 的范围检查。用 `case` 的守卫（`Ok(q) if q >= 1`）可以一次表达两个条件。
- 原样接受空的商品编码。即使是按字符串解析的字段，只要有规则就必须检查。
