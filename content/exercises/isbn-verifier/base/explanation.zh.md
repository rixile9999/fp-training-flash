`is_valid` 是必须对任何字符串都给出答案的**全函数**。然而其中“把字符变成数字”是可能失败的偏操作。解决办法是用 `Result` 接住可能失败的部分并处理它，只在最外层转换一次成 `Bool`。

代码分为两个步骤。

- **解析** `parse(isbn) -> Result(List(Int), Nil)`：去掉连字符，检查长度是否为 10，再求出每个字符的值。`char_value` 只在位置 9 把 `X` 认作 10，其余交给 `int.parse`。`list.try_map` 在第一次失败时就返回 `Error(Nil)`，所以只要有一个错误字符，整个解析就失败。
- **计算** `checksum(values)`：只接收值列表，求加权和。这里可以放心地认为输入已经是正确的。

```gleam
case parse(isbn) {
  Ok(values) -> checksum(values) % 11 == 0
  Error(Nil) -> False
}
```

常见错误有三个。

- 像 `result.unwrap(int.parse(char), 0)` 这样，把解析失败的字符变成 0。程序虽然不会崩溃，却会把 `3-598-P1581-X` 这种加权和碰巧对得上的错误输入判为 `True`。用默认值掩盖失败，“全函数”就变成了“给出错误答案的函数”。
- 不管位置如何都把 `X` 当作 10。`X` 只在校验位上才有意义。
- 漏掉长度检查。空字符串的加权和是 0，能被 11 整除，于是得到 `True`。

如果写成 `let assert Ok(d) = int.parse(char)`，遇到错误字符时程序就会崩溃。为什么要用类型暴露失败的可能性并处理到底，理论笔记“全函数与偏函数”（total-vs-partial-functions）中有更多讨论。
