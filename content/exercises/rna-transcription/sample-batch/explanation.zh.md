整批样本是“所有样本都成功才算成功，否则给出第一个失败”。把基础题中用于字符列表的 `list.try_map` 提高一层，这次用在样本列表上即可。

```gleam
list.try_map(samples, transcribe_sample)

fn transcribe_sample(sample: Sample) -> Result(#(String, String), String) {
  to_rna(sample.dna)
  |> result.map(fn(rna) { #(sample.id, rna) })
  |> result.replace_error(sample.id)
}
```

`to_rna` 的错误是 `Nil`，所以它不知道“是哪个样本出了错”。知道这一信息的是持有样本的外层函数，因此在外层用 `result.replace_error(sample.id)` 把错误换成更有用的值。成功值也用 `result.map` 变成 `#(id, rna)` 配对。像这样单独写一个处理单个样本的函数，传给 `try_map` 的部分一行就能写完，而且可以单独检查单个样本的规则。

常见错误有两种。

- 用 `list.filter_map` 只收集成功的样本。不合法的样本会悄悄从结果中消失，调用方根本不知道样本少了。
- 用 `list.fold` 手动累积，每次失败都用 `Error(sample.id)` 覆盖。这样报告的是最后一个失败的样本。`try_map` 在第一次失败时停下，不会给这种错误留下余地。

把小的 `Result` 函数组合成大的 `Result` 函数的方式，在理论笔记“错误也是值”（errors-as-values）中有更多介绍。
