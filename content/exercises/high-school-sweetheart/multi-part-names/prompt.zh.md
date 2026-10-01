扩展首字母功能，让它也能处理带中间名或空格不规整的名字。`first_letter` 和 `initial` 已经在初始代码中实现好了。

1. `name_parts(full_name: String) -> List(String)`
   - 按空格（`" "`）拆分名字，按原来的顺序返回单词列表。
   - 不要包含因首尾空格或连续空格而产生的空单词（`""`）。
2. `initials(full_name: String) -> String`
   - 对 `name_parts` 中的每个单词应用 `initial`，再用一个空格连接起来。
   - 一个单词都没有时返回 `""`。
3. `monogram(full_name: String) -> String`
   - 取出 `name_parts` 中每个单词的首字母并转成大写，不加空格地连在一起。

```gleam
name_parts("  mary   jane watson ")   // -> ["mary", "jane", "watson"]
initials("  mary   jane watson ")     // -> "M. J. W."
monogram("grace brewster hopper")     // -> "GBH"
```
