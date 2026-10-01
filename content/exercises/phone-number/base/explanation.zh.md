错误类型 `PhoneError` 为每种失败原因各设一个构造器。调用方可以用 `case` 区分原因，显示不同的提示，比如“不能输入英文字母”“号码太短”。如果把错误糊成 `String` 或 `Nil`，这种区分就消失了。还可以像 `InvalidCharacter` 那样，把需要的信息（出问题的字符）放进构造器里。

有多项检查时，“哪个错误先被报告”也是规格的一部分。把步骤拆成函数并用 `use` 连接，代码的行序就是检查顺序。

```gleam
pub fn clean(input: String) -> Result(String, PhoneError) {
  use digits <- result.try(extract_digits(input))  // 1. 字符检查
  normalize_length(digits)                         // 2. 长度，3. 国家代码
}
```

- `extract_digits` 去掉分隔符后，用 `list.try_map` 逐个确认字符是否为数字。`try_map` 在第一次失败时就停止，所以会自然地报告“最前面的错误字符”。
- `normalize_length` 用 `case` 同时按数字个数和列表形状来区分。一个 `11, ["1", ..rest]` 模式既确认了“11 位且以 1 开头”，又顺便去掉了国家代码。

常见错误有三种。

- 只保留数字，其余全部丢掉（`list.filter(is_digit)`）。像 `"523-abc-7890"` 这样的错误输入，只要数字个数凑巧对上就会通过，或者被报告成莫名其妙的长度错误。
- 先检查长度。`"555-12x"` 应该先报字符错误，结果却得到 `TooFewDigits`。
- 不单独拦截超过 11 位的情况，而是按“11 位及以上就检查国家代码”处理。12 位的号码会变成 `InvalidCountryCode`，或者被错误地判定为成功。

为什么要用代数数据类型表达失败原因，在理论笔记“和类型与穷尽匹配”（algebraic-data-types）和“错误也是值”（errors-as-values）中有更多讨论。
