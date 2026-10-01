实现 `to_rna(dna: String) -> Result(String, Nil)`：接收一条 DNA 链，返回转录后的 RNA 链。

DNA 链是由大写字母 `G`、`C`、`T`、`A` 组成的字符串。把每个碱基换成下表中的配对碱基，就得到 RNA。

| DNA | RNA |
|---|---|
| `G` | `C` |
| `C` | `G` |
| `T` | `A` |
| `A` | `U` |

- 结果是按输入顺序拼接的字符串，用 `Ok` 包裹。空字符串返回 `Ok("")`。
- 只要有一个字符不是上面四个大写字母（小写字母、空格、`U` 等），就返回 `Error(Nil)`。

```gleam
to_rna("ACGT")  // -> Ok("UGCA")
to_rna("ACXT")  // -> Error(Nil)
```
