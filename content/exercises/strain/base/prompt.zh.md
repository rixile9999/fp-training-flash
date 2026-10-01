编写两个接收列表和条件函数（`fn(t) -> Bool`）的函数。

- `keep(items, predicate)`：返回只保留条件为 `True` 的元素的列表。
- `discard(items, predicate)`：丢弃条件为 `True` 的元素，返回其余元素。
- 两个函数都保持剩余元素原来的顺序。
- 不要使用 `list.filter`、`list.partition` 这类过滤函数。用递归实现。

对同一个列表和条件，把 `keep` 与 `discard` 的结果合在一起，原来的元素一个不少。

```gleam
keep([1, 2, 3, 4, 5], int.is_even)
// -> [2, 4]
discard([1, 2, 3, 4, 5], int.is_even)
// -> [1, 3, 5]
```
