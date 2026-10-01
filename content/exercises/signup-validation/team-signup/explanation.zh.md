每个人的检查彼此独立，负责人需要一次知道所有出错的人，才能修改名单。所以不用在第一个失败处停止的 `list.try_map`，而是采用**全部执行后再拆分**的方式。

1. 用 `list.index_map` 对每个人执行 `validate_all`，并用 `result.map_error` 只在错误一侧加上编号（`index + 1`）。结果是 `List(Result(NewUser, #(Int, List(SignupError))))`。成功和失败的类型都统一了，所以可以放进同一个列表。
2. 用 `result.partition` 把成功值和错误分开。只有错误列表为空时才返回 `Ok`。
3. `result.partition` 返回的两个列表都是**逆序**的（标准库文档中写明了这一点）。所以要对两者都做 `list.reverse`。

这道题叠加了两层“收集所有错误”。在一个人内部，由 `validate_all` 收集字段错误；在整份名单上，由 `validate_team` 收集每个人的错误。不丢弃低层的错误（`List(SignupError)`），而是附上编号这一上下文，包装成高层的错误，这是主题 **错误也是值（errors-as-values）** 的典型体现。会停止的串联（`try`）与会收集的组合（`partition`）之间的区别，在主题 **串联 Result 与单子** 中讲解。

常见错误：

- 直接返回 `result.partition` 的结果，导致人员顺序和错误顺序都颠倒。
- 直接使用 `list.index_map` 的索引，导致编号从 0 开始。
- 用 `list.try_map` 处理，只报告了第一个出错的人。
