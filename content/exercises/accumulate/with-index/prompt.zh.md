编写 `accumulate_indexed(list, fun)`。它把每个元素连同该元素的**位置序号**一起传给函数，用结果构成新列表。

- 调用 `fun(元素, 位置序号)`。第一个元素的位置序号是 0，之后逐个加 1。
- 结果列表的长度和顺序与输入相同。
- 不使用 `list.map`、`list.index_map` 等 map 系列函数，用递归实现。

```gleam
accumulate_indexed(["a", "b", "c"], fn(x, i) { #(i, x) })
// -> [#(0, "a"), #(1, "b"), #(2, "c")]
```
