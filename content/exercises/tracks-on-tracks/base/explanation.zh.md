Gleam 的列表是从前往后连接的链表，所以用 `[language, ..languages]` 往最前面添加最自然，开销也是常数。`list.append(languages, [language])` 是加到末尾，顺序与要求不同，而且会复制整个列表。

计数和反转用 `list.length`、`list.reverse` 就够了。也可以自己用递归实现，但使用已经验证过的标准函数，意图更清楚。

`exciting_list` 就是把“结果为真的形状”原样写成列表模式。

```gleam
case languages {
  ["Gleam", ..] -> True
  [_, "Gleam"] | [_, "Gleam", _] -> True
  _ -> False
}
```

`[_, "Gleam"]` 只匹配长度恰好为 2 的列表，`[_, "Gleam", _]` 只匹配长度恰好为 3 的列表，所以长度条件已经包含在模式中。常见错误有两种。

- `list.contains(languages, "Gleam")`：不看位置，所以排在第三的 Gleam 也会判为真。
- `[_, "Gleam", ..]`：由于剩余模式 `..`，长度为 4 及以上的列表也会匹配。

把列表看作“要么是空列表，要么是一个元素加上剩余列表”的观点，在理论笔记 structural-recursion-induction（结构递归与归纳法）中有更多介绍；用 `case` 穷尽地划分情况，则在“和类型与穷尽匹配”中有更多介绍。
