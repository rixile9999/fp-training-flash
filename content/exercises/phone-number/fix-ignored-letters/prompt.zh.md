在短信通知的注册表单中发现了一个问题：像 `223-45a6-7890` 这样夹杂着输入错误的号码会被原样注册。这是因为号码整理函数 `clean` 会悄悄删掉所有不是数字的字符。请修复代码。

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}
```

正确的行为是按以下顺序检查，返回第一个未通过的检查对应的错误。

1. **字符检查**：只把空格、`(`、`)`、`-`、`.`、`+` 视为分隔符并去掉。剩下的字符中如果有不是数字的，返回 `InvalidCharacter(该字符)`。有多个时，取输入中最靠前的那个。
2. **长度检查**：数字少于 10 个返回 `TooFewDigits`，多于 11 个返回 `TooManyDigits`。
3. **国家代码**：11 位时，第一个数字是 `1` 就去掉，否则返回 `InvalidCountryCode`。

长度和国家代码的处理（`normalize_length`）已经是正确的。

```gleam
clean("223-45a6-7890")  // -> Error(InvalidCharacter("a"))   （现在是 Ok("2234567890")）
clean("223.456.7890")   // -> Ok("2234567890")
```
