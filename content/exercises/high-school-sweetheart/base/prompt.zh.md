请编写四个函数，为一对高中情侣生成可以发到社交媒体上的首字母爱心。后面的函数必须复用前面写好的函数。

1. `first_letter(name: String) -> String`
   - 去掉名字首尾的空格、制表符和换行后，**按原大小写**返回第一个字母。
   - 去掉后如果是空字符串，返回 `""`。
2. `initial(name: String) -> String`
   - 把 `first_letter` 的结果变成大写，并在后面加上 `.`。
3. `initials(full_name: String) -> String`
   - 接收用一个空格隔开的名和姓（例如 `"Lance Green"`），把各自的 `initial` 用一个空格连接起来。
4. `pair(full_name1: String, full_name2: String) -> String`
   - 返回 `heart_top <> 第一个人的 initials <> "  +  " <> 第二个人的 initials <> heart_bottom`。
   - 爱心形状的字符串 `heart_top`、`heart_bottom` 已作为常量写在初始代码中。

```gleam
first_letter("\n  jane ")   // -> "j"
initial("robert")          // -> "R."
initials("Lance Green")    // -> "L. G."
```

`pair("Blake Miller", "Riley Lewis")` 的中间一行是 `**     B. M.  +  R. L.     **`。
