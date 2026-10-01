接收一个 DNA 碱基序列，统计四种碱基 `A`、`C`、`G`、`T` 的数量；如果有错误字母，要报告**什么**在**哪里**出了错。

```gleam
pub type CountError {
  InvalidNucleotide(letter: String, index: Int)
}
```

- 如果所有字母都是大写的 `A`、`C`、`G`、`T`，返回 `Ok(counts)`。`counts` 中总是包含四个键（没出现的碱基为 0）。
- 如果有其他字母（包括小写），返回 `Error(InvalidNucleotide(letter, index))`。`index` 是从 0 开始计数的位置。
- 有多个错误字母时，报告**最前面的那个**。

```gleam
nucleotide_count("GATXACZ")
// -> Error(InvalidNucleotide("X", 3))
```
