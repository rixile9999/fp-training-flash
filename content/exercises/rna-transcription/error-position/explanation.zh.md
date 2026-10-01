要在错误中包含位置，就必须在检查字符的那一刻知道它的位置。所以先用 `list.index_map` 给每个字符附上位置，然后用和基础题相同的 `list.try_map` 进行转换。

```gleam
|> list.index_map(fn(nucleotide, position) { #(position, nucleotide) })
|> list.try_map(fn(pair) {
  let #(position, nucleotide) = pair
  complement(nucleotide)
  |> result.replace_error(InvalidNucleotide(position, nucleotide))
})
```

`complement` 仍然返回 `Result(String, Nil)`，因为单个碱基的规则不需要知道位置。位置信息是在外层用 `result.replace_error` 把错误换成更详细的值时附加上去的。小函数给出简单的错误，由了解上下文的一方把错误变得更丰富。

“最靠前的错误”这一要求，由 `try_map` 在第一个 `Error` 处停止的性质自动满足。

常见错误有两种。

- 位置从 1 开始计数。`index_map` 给出的位置从 0 开始，直接使用即可。
- 用 `list.fold` 或 `list.index_fold` 手动累积，每次失败都重新覆盖错误。这样留下的是最后一个错误。已经是 `Error` 的累加器不应再改变，但手写这条规则时很容易遗漏。使用 `try_map` 或 `try_fold`，就不必亲自写这条规则。

把错误定义成自定义类型来携带所需信息的方法，在理论笔记“错误也是值”（errors-as-values）中有更多介绍。
