公开函数 `accumulate_indexed(list, fun)` 没有地方存放“现在是第几个”。所以要加一个以位置序号和结果累加器为参数的辅助函数 `go`，公开函数只负责设定初始状态（序号 0、空累加器）并调用它。

```gleam
fn go(items, fun, index, acc) {
  case items {
    [] -> list.reverse(acc)
    [first, ..rest] -> go(rest, fun, index + 1, [fun(first, index), ..acc])
  }
}
```

每次递归处理一个元素，所以 `index + 1` 正好是下一个元素的位置。由于结果堆在 `acc` 前面，最后要反转一次以恢复原来的顺序。像这样递归调用是最后一步、之后不再有其他工作的尾递归，不会让调用栈增长。把需要的状态放在参数里带着走的做法，在理论笔记 accumulators-and-tail-recursion（累加器与尾递归）中讨论。

常见错误有两个。

- 把起始序号设为 1：所有序号都会错开一位。如果需要给人看的编号，在调用方使用 `i + 1` 即可。
- 漏掉 `list.reverse`：结果会颠倒。

由于保持了输入的长度和顺序，这个函数也具有“保持结构的变换：函子”中 map 的性质。位置序号只是传给转换函数的附加信息。
