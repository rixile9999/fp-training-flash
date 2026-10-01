基础题中的整理步骤现在以 `normalize(input: String) -> Result(String, PhoneError)` 的名字放在初始代码里。这次要把 NANP 号码的两条规则作为**独立的检查函数**添加进来，并在 `clean` 中把各步骤连接起来。

在 10 位号码 `NXX NXX-XXXX` 中，前三位是区号，接下来三位是交换码。两种代码的第一位数字都必须是 `2`–`9`。

```gleam
pub type PhoneError {
  InvalidCharacter(found: String)
  TooFewDigits
  TooManyDigits
  InvalidCountryCode
  InvalidAreaCode(first: String)
  InvalidExchangeCode(first: String)
}
```

请实现下面三个函数。两个检查函数可以假定收到的是已通过 `normalize` 的 10 位数字字符串。

- `check_area_code(number: String) -> Result(String, PhoneError)`：第一位数字（位置 0）是 `"0"` 或 `"1"` 时返回 `InvalidAreaCode(该数字)`，否则返回 `Ok(number)`。
- `check_exchange_code(number: String) -> Result(String, PhoneError)`：第四位数字（位置 3）是 `"0"` 或 `"1"` 时返回 `InvalidExchangeCode(该数字)`，否则返回 `Ok(number)`。
- `clean(input: String) -> Result(String, PhoneError)`：按 `normalize` → `check_area_code` → `check_exchange_code` 的顺序应用，返回第一个失败步骤的错误。

```gleam
check_exchange_code("2231567890")  // -> Error(InvalidExchangeCode("1"))
clean("1 (223) 456-7890")          // -> Ok("2234567890")
clean("(023) 156-7890")            // -> Error(InvalidAreaCode("0"))
```
