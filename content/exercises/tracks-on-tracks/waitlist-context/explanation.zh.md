候位名单是链表，所以用 `[name, ..queue]` 加到前面会立即完成，而用 `list.append(queue, [name])` 加到后面则要走完整个列表并重新构建。要求的核心在于这两种操作得到的顺序不同。如果用 `[name, ..queue]` 加入普通客人，就等于插队。

`seat_next` 和 `next_two` 按名单的形状分情况处理。

```gleam
case queue {
  [first, second, ..] -> [first, second]
  short -> short
}
```

有两位及以上时返回前两位；比这短时（空列表或一位），原样返回名单本身。常见错误是把最后一个分支写成 `_ -> []`，在只有一位客人等候时把这位客人弄丢了。`list.take(queue, 2)`、`list.drop(queue, 1)` 也遵循同样的规则，可以放心使用。

用空列表和“一个元素 + 剩余部分”这两种形状来处理列表的方式，在理论笔记 structural-recursion-induction（结构递归与归纳法）中有介绍。
