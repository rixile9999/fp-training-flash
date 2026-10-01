`resolve` 用不同的方式把三步查找串起来。

- **查找配置档用 `result.try` 连接**，因为在这里失败就必须结束。不存在的配置档名称多半是拼写错误，如果回退到 default，就会把错误掩盖起来。
- **查找键用 `result.lazy_or` 连接**。配置档里没有某个键是正常情况，只有这时才去看 default。`lazy_or` 只在前面的结果是 `Error` 时才执行函数，所以优先顺序（配置档 → default）原原本本地体现在代码顺序上。
- 最后用 `result.replace_error(MissingKey(key))` 把“哪里都没有”转换成本题的错误。由于 `from_default` 返回 `Result(String, Nil)`，没有 default 配置档的情况也走同一条路径。

`try` 是“成功就继续”，`lazy_or` 是“失败就换个备选”。区分这两种连接方式并各用其所，就是理论笔记“串联 Result 与单子”（chaining-results-monads）在实战中的样子。

`resolve_int` 不重新实现回退规则，只在 `resolve` 的结果后面接上 `int.parse`。这样“查找值的规则”和“解释值的规则”就不会混在一起。如果找到的值是错的，那就是配置失误，必须用 `NotAnInt` 报告出来（理论笔记“错误也是值”）。

常见错误：

- 把不存在的配置档当作空配置处理，返回 default 的值。
- 在 `resolve_int` 中写成“把配置档的值转成整数，失败就用 default”，连解析失败也当作回退对象。这样写错的生产配置会悄悄地变成默认值。
- 先查 default，导致配置档的值被忽略。
