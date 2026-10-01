实验室想一次性转录多个样本的 DNA。转录单个样本的 `to_rna(dna: String) -> Result(String, Nil)` 已经实现好了（规则与基础题相同）。请利用它实现 `transcribe_samples`。

```gleam
pub type Sample {
  Sample(id: String, dna: String)
}

pub fn transcribe_samples(
  samples: List(Sample),
) -> Result(List(#(String, String)), String)
```

- 所有样本的 DNA 都合法时，按输入顺序把 `#(样本 id, RNA)` 配对组成列表，放入 `Ok` 返回。没有样本时返回 `Ok([])`。
- DNA 为空字符串的样本也是合法样本（`to_rna("")` 为 `Ok("")`）。
- 如果有样本使 `to_rna` 失败，以 `Error` 返回该样本的 `id`。有多个时，返回列表中最靠前的样本的 `id`。

```gleam
transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GG")])
// -> Ok([#("S1", "UGCA"), #("S2", "CC")])

transcribe_samples([Sample("S1", "ACGT"), Sample("S2", "GXG")])
// -> Error("S2")
```
