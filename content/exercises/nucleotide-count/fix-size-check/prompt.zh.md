下面的 `nucleotide_count` 用来统计 DNA 碱基序列中 `A`、`C`、`G`、`T` 的数量，但对某些输入会给出错误结果。请按规则修改它。

- 结果是 `Ok(counts)`，`counts` 中总是包含 `"A"`、`"C"`、`"G"`、`"T"` 四个键，包括一次都没出现的碱基。
- 只有大写的 `A`、`C`、`G`、`T` 有效。只要有一个其他字母，就返回 `Error(Nil)`。
- 空字符串是有效的，四种碱基的数量都是 0。

现在的代码是这样运行的。

```gleam
nucleotide_count("GATTACA")  // -> Ok(A: 3, C: 1, G: 1, T: 2)  （正确）
nucleotide_count("AAX")      // -> Ok(A: 2, X: 1)  （应该是 Error(Nil)）
nucleotide_count("")         // -> Ok(空字典)  （四种碱基都应该是 0）
```
