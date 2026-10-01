bug 就是 `list.filter(is_digit)` 这一行。它丢掉了所有不是数字的字符，所以不只是允许的分隔符，连输入错误（`a`）和莫名其妙的符号（`#`）也一起消失了。后面的长度检查只看数字，于是把错误的输入当成了正确的号码。

关键在于区分“可以丢掉的字符”和“必须报告的字符”。

```gleam
fn extract_digits(input: String) -> Result(List(String), PhoneError) {
  input
  |> string.to_graphemes
  |> list.filter(fn(char) { !is_separator(char) })   // 只丢掉分隔符
  |> list.try_map(fn(char) {                          // 其余字符必须是数字
    case is_digit(char) {
      True -> Ok(char)
      False -> Error(InvalidCharacter(char))
    }
  })
}
```

`clean` 通过 `use digits <- result.try(extract_digits(input))`，只有先通过字符检查才会进入长度检查。所以 `"555-12x"` 得到的不是长度错误，而是 `InvalidCharacter("x")`。

修复时常见的错误有三种。

- 只查找并拦截英文字母。`#` 这样的符号仍然会悄悄消失。不以“要拦截什么”而以“允许什么”（分隔符和数字）为基准，就不会漏掉任何字符。
- 把分隔符也当作错误字符。像 `"+1 (223) 456-7890"` 这样的正常输入会被拒绝。
- 先做原有的数字个数检查，之后才加上字符检查。检查顺序就与规格不一致了。

为什么不丢弃错误的输入，而是把它作为错误值传递出去，在理论笔记“错误也是值”（errors-as-values）中有更多讨论。
