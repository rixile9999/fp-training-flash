`dict.get` 和 `int.parse` 都返回 `Result(_, Nil)`。它只告诉你“失败了”，却不说原因，所以直接串起来就无法区分“键不存在”和“值不对”。因此答案在**每一步**都用 `result.replace_error` 附上本题的错误：`dict.get` 之后是 `MissingKey(key)`，`int.parse` 之后是 `NotAnInt(key, value)`。这两种错误要求运维人员采取不同的行动（是添加键，还是修改值）。

`use value <- result.try(...)` 的意思是“成功就取出值进入下一行，失败就以该错误结束整个函数”。`get_port` 也用同样的方式接着 `get_int` 的结果，只检查范围。不必重写错误处理，`get_int` 的错误就会原样传递出去。这种串联方式是理论笔记“串联 Result 与单子”（chaining-results-monads）的内容，而把失败作为返回值暴露出来的设计则在理论笔记“错误也是值”（errors-as-values）中讨论。

常见错误：

- 像 `dict.get(...) |> result.try(int.parse) |> result.replace_error(MissingKey(key))` 这样只在最后替换一次错误。看起来更短，但值不合法时也会变成 `MissingKey`。
- 在 `get_port` 中用 `result.unwrap(get_int(...), 0)` 取值。原来的错误消失了，报告的却是“端口 0 超出范围”这种莫名其妙的错误。
- 把上限写成 `<`，结果拒绝了 65535。
