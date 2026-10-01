基础题中失败的原因只有一个（`Nil`），这次则返回为每种原因各设一个构造器的 `IsbnError`。把各项检查拆成步骤函数并用 `use` 串起来，代码的行序就正好是“哪个错误先被报告”。

```gleam
use chars <- result.try(check_length(chars))    // 1. 长度
use values <- result.try(parse_values(chars))   // 2. 字符
case checksum(values) % 11 {                    // 3. 加权和
  0 -> Ok(values)
  _ -> Error(ChecksumMismatch)
}
```

每一步都产出下一步需要的东西并传下去。要有通过长度检查的字符列表，才能判断位置 9 的 `X`；要有字符值列表，才能计算加权和。所以顺序是自然确定的。

在 `parse_values` 中，`char_value` 和基础题一样只返回 `Result(Int, Nil)`，由知道位置和字符的外层用 `result.replace_error(InvalidCharacter(index, char))` 把错误细化。

常见错误有三个。

- 在原字符串中数位置。如果在去掉连字符之前编号，`"3-598-P1581-X"` 中的 `P` 会被报告为位置 6。规格中的位置是去掉连字符之后的位置。
- 先检查字符。这样对 11 个字符的输入，得到的是字符错误而不是长度错误。
- 在任意位置都把 `X` 当作 10。

按类型区分失败原因、让调用方用 `case` 处理的设计，在理论笔记“错误即值”（errors-as-values）中有更多讨论。
