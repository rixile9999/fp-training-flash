我们想把客户咨询的标题规范化，以便于比较。请先写两个小函数，再把它们连接起来构成 `normalize`。

1. `strip_punctuation(text: String) -> String`
   - 只删除 `.` `,` `!` `?` 这四种字符（全部删除）。其他字符保持不变。
2. `collapse_spaces(text: String) -> String`
   - 按空格字符（`" "`）拆分，丢掉空片段，再用一个空格重新连接。这样连续的空格就变成一个，首尾空格也会消失。
3. `normalize(text: String) -> String`
   - 按以下顺序应用：去掉首尾空白（`string.trim`，包括制表符和换行符）→ 转小写 → `strip_punctuation` → `collapse_spaces`

```gleam
strip_punctuation("Hi, there! Ok?")   // -> "Hi there Ok"
collapse_spaces("a   b  c")           // -> "a b c"
normalize("  Hello,   World!! ")      // -> "hello world"
```
