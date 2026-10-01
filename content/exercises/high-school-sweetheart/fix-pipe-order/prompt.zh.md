下面模块中的 `initial` 函数返回了错误的值。`initial("Betty")` 应该是 `"B."`，现在却得到 `"B"`，因此 `initials` 也错了。请修复 `initial` 中的 bug。

- `first_letter(name)`：去掉首尾空白后，按原大小写返回第一个字母。（已经正确）
- `initial(name)`：把 `first_letter` 的结果变成大写，并在后面加上 `.`。
- `initials(full_name)`：把用一个空格隔开的名和姓各自的 `initial` 用一个空格连接起来。（已经正确）

```gleam
initial("  james ")        // -> "J."
initials("Linda Miller")   // -> "L. M."
```
