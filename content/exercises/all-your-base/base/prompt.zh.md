实现 `rebase`：接收用某种进制写出的数字位列表，把同一个数转换成另一种进制的数字位列表。错误的输入用 `Error` 报告。

```gleam
pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn rebase(
  digits digits: List(Int),
  input_base input_base: Int,
  output_base output_base: Int,
) -> Result(List(Int), RebaseError)
```

- `digits` 是 `input_base` 进制的数字位，从高位到低位排列。结果同样从高位开始返回，且不带前导零。
- 如果这个数的值为 0（空列表、`[0, 0, 0]` 等），结果是 `Ok([0])`。
- 如果进制小于 2，返回 `Error(InvalidBase(该进制))`。
- 如果某个数字位小于 0 或大于等于 `input_base`，返回 `Error(InvalidDigit(该数字位))`。有多个错误数字位时，报告最前面的那个。
- 检查顺序是输入进制、输出进制、数字位。只返回最先发现的一个错误。
- 转换要自己实现（不要使用 `int.digits`、`int.undigits`）。

```gleam
rebase(digits: [1, 0, 1, 0, 1, 0], input_base: 2, output_base: 10)
// -> Ok([4, 2])        (二进制 101010 = 42)
rebase(digits: [1, 2], input_base: 2, output_base: 10)
// -> Error(InvalidDigit(2))
```
