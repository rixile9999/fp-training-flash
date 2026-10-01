实验室提出请求：只有 `Error(Nil)` 的话，很难找出长 DNA 序列中哪里出了错。请重新实现 `to_rna`，让错误中包含位置和字符。

```gleam
pub type TranscriptionError {
  InvalidNucleotide(position: Int, found: String)
}

pub fn to_rna(dna: String) -> Result(String, TranscriptionError)
```

- 转换规则不变：`G`→`C`、`C`→`G`、`T`→`A`、`A`→`U`。按输入顺序拼接结果，用 `Ok` 包裹。空字符串返回 `Ok("")`。
- 如果有不属于这四个大写字母的字符，返回 `Error(InvalidNucleotide(position, found))`。
  - `position` 是该字符的位置，**从 0 开始**计数。
  - `found` 是该字符本身。
  - 有多个错误字符时，报告最靠前（位置最小）的那个。

```gleam
to_rna("ACGT")   // -> Ok("UGCA")
to_rna("ACXT")   // -> Error(InvalidNucleotide(position: 2, found: "X"))
```
