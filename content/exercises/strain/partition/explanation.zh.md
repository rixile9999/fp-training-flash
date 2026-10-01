结果有两个，所以累加器也设两个。每个元素只计算一次条件，把它堆到其中一个累加器上；列表结束时，把两边分别反转，再打包成元组。

```gleam
case items {
  [] -> #(list.reverse(kept), list.reverse(rejected))
  [first, ..rest] ->
    case predicate(first) {
      True -> go(rest, predicate, [first, ..kept], rejected)
      False -> go(rest, predicate, kept, [first, ..rejected])
    }
}
```

分别调用 `keep` 和 `discard` 结果也一样，但会遍历列表两遍，每个元素的条件函数也要调用两次。条件计算开销大或者列表很长时，差距会变大。用一次遍历收集多个结果，归根结底就是“带两个状态的 fold”，在理论笔记 fold-universality（fold 的普适性）和 accumulators-and-tail-recursion（累加器与尾递归）中讨论。

常见错误有两种：

- 只反转了一边的累加器，导致另一边顺序颠倒。
- 把元组顺序弄反，返回 `#(假, 真)`。返回类型是 `#(List(t), List(t))`，编译器发现不了，必须用测试来确认。
