编写 `partition(items, predicate)`：接收列表和条件函数，把列表分成满足条件的元素和不满足条件的元素。

- 返回值是元组 `#(条件为 True 的元素, 条件为 False 的元素)`。
- 两个列表都保持原来的顺序。同一个值出现多次时全部保留。
- 列表 **只遍历一次**。不要像分别调用 `keep` 和 `discard` 那样遍历两遍。
- 不要使用 `list.filter`、`list.partition`。

```gleam
partition([1, 2, 3, 4, 5], int.is_even)
// -> #([2, 4], [1, 3, 5])
```
