这是把多条日志归约成一页汇总的工作，所以使用 `list.fold`，并直接把 `Summary` 记录当作累加器。空汇总 `Summary(0, 0, 0, None)` 是初始值，反映一条日志的 `add_entry(summary, entry) -> Summary` 是折叠函数。

`add_entry` 先增加所有日志共有的 `total`，再用 `case entry.level` 增加各级别对应的字段。`Level` 是和类型，所以编译器会检查四个级别是否都处理到了（理论笔记“和类型与穷尽匹配”）。把公共的更新放到 `case` 外面，就从结构上杜绝了在某个分支里漏加 `total` 的错误。常见错误正是这个：如果按“不关心的级别直接跳过”的想法写成 `Debug -> summary`，调试日志就会从总数中漏掉。

`first_critical` 必须只记录“第一条”。`option.or(summary.first_critical, Some(entry.message))` 在已有值时选已有的值，没有时选新消息。如果每次都用 `Some(entry.message)` 覆盖，留下的就是最后一条严重日志。折叠从前往后逐个访问元素，所以“第一条”和“最后一条”的区别就取决于是否覆盖（理论笔记“fold 的普适性：列表递归的共同骨架”）。
