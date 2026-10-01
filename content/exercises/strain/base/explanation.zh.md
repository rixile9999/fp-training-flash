`keep` 沿着列表一次走一个元素，对每个元素只决定“要不要留下”。条件为真就放进累加器，为假就跳过。因为是堆在累加器前面的，所以最后用 `list.reverse` 恢复原来的顺序。

```gleam
case items {
  [] -> list.reverse(acc)
  [first, ..rest] ->
    case predicate(first) {
      True -> go(rest, predicate, [first, ..acc])
      False -> go(rest, predicate, acc)
    }
}
```

`discard` 就是“条件取反的 keep”。不重写递归，而是写成 `keep(items, fn(item) { !predicate(item) })`，遍历和保持顺序的规则就只存在于一个地方，两个函数不会出现不一致。这种把函数当作值传递来组装行为的方式，在理论笔记 higher-order-modularity（高阶函数与模块化）中讨论。累加器和最后的反转在 accumulators-and-tail-recursion（累加器与尾递归）中讨论。

常见错误有两种：

- 堆进累加器后没有反转，得到 `[3, 1]` 而不是 `[1, 3]`。
- 从 `keep` 复制出 `discard` 时漏掉了条件取反，导致两个函数结果相同。
