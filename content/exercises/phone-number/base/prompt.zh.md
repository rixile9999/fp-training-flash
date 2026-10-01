一个短信发送服务接收北美编号计划（NANP）的电话号码。请实现 `clean(input: String) -> Result(String, PhoneError)`，把用户输入的各种形式的号码整理成 10 位数字。

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
}
```

按下面的顺序检查，返回第一个未通过的检查对应的错误。

1. **字符检查**：把空格、`(`、`)`、`-`、`.`、`+` 视为分隔符并去掉。剩下的字符中如果有不是数字（`0`–`9`）的，返回 `InvalidCharacter(该字符)`。有多个时，取输入中最靠前的那个。
2. **长度检查**：数字少于 10 个返回 `TooFewDigits`，多于 11 个返回 `TooManyDigits`。
3. **国家代码**：数字有 11 个时，第一个数字是国家代码。是 `1` 就去掉，否则返回 `InvalidCountryCode`。

成功时用 `Ok` 返回 10 位数字字符串。本题不检查区号规则。

```gleam
clean("+1 (223) 456-7890")  // -> Ok("2234567890")
clean("223-abc-7890")       // -> Error(InvalidCharacter("a"))
clean("22234567890")        // -> Error(InvalidCountryCode)
```
