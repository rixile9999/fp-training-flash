把按升序排序整数列表的归并排序拆成三个函数来实现。测试会分别调用这三个函数。

- `split(items: List(Int)) -> #(List(Int), List(Int))`：分成前 `length / 2` 个元素（整数除法）和其余部分。元素顺序保持不变。
- `merge(left: List(Int), right: List(Int)) -> List(Int)`：把两个升序列表合并成一个升序列表。相同的值有几个就保留几个。
- `sort(items: List(Int)) -> List(Int)`：用 `split` 拆分，递归地分别排序两半，再用 `merge` 合并。
- 即使有 15 万个元素也必须在时间限制内完成（O(n log n)）。不要使用 `list.sort`。可以使用 `list.length` 和 `list.split`。

```gleam
split([5, 1, 4])           // -> #([5], [1, 4])
merge([1, 5], [2, 4])      // -> [1, 2, 4, 5]
sort([5, 2, 9, 1, 5, 6])   // -> [1, 2, 5, 5, 6, 9]
```
