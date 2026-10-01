编写 `accumulate(list, fun)`：接收一个列表和一个函数，返回对每个元素应用该函数后的新列表。这道题要你亲手实现标准库 `list.map` 所做的事。

- 结果列表的长度与输入相同，元素顺序也保持不变。
- 结果元素的类型可以与输入不同。（`fn(a) -> b`）
- 不使用 `list.map`、`list.index_map` 等 map 系列函数，用递归实现。

```gleam
accumulate([1, 2, 3], fn(x) { x * x })
// -> [1, 4, 9]
```
