接收一个字符串形式的 DNA 碱基序列，统计四种碱基 `A`、`C`、`G`、`T` 各有几个，并以字典形式返回。

- 结果是 `Ok(counts)`，`counts` 中总是包含 `"A"`、`"C"`、`"G"`、`"T"` 四个键，包括一次都没出现的碱基。
- 只有大写的 `A`、`C`、`G`、`T` 是有效字母。只要有一个小写字母或其他字母，就返回 `Error(Nil)`。
- 空字符串是有效的，四种碱基的数量都是 0。

```gleam
nucleotide_count("GATTACA")
// -> Ok(dict.from_list([#("A", 3), #("C", 1), #("G", 1), #("T", 2)]))

nucleotide_count("GATXACA")
// -> Error(Nil)
```
