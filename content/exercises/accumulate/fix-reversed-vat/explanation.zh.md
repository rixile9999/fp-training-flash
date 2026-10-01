原因不在 `with_vat`，而在公共函数 `accumulate` 的辅助函数 `go` 中。`go` 用 `[fun(first), ..acc]` 把处理后的值堆在累加器的**前面**。第一个元素最先放入，也被挤到最后面，所以堆好的累加器与输入顺序相反。因此必须在累加结束的空列表分支中反转一次。

```gleam
case items {
  [] -> list.reverse(acc)
  [first, ..rest] -> go(rest, fun, [fun(first), ..acc])
}
```

往前添加是常数时间，最后的反转只做一次，所以整体是线性时间。如果每一步都用 `list.append(acc, [x])` 追加到末尾，顺序虽然正确，但每次都要复制累加器，就变成了平方时间。这种“往前堆叠、最后反转”的模式在理论笔记 accumulators-and-tail-recursion（累加器与尾递归）中讨论。

常见错误是只在出现症状的 `with_vat` 中用 `list.reverse` 把结果反转。这样能通过一个测试，但其他所有使用 `accumulate` 的地方仍然会得到颠倒的结果。`accumulate` 是一个和 map 一样承诺保持顺序的函数（“保持结构的变换：函子”），所以应该修复违背这一承诺的地方。
