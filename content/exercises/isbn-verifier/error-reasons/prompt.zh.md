在图书登记页面上，ISBN 有错时只显示“错误”，图书管理员不知道该改哪里。请实现 `validate`，告诉他们错在哪里。

```gleam
pub type IsbnError {
  WrongLength(length: Int)
  InvalidCharacter(position: Int, found: String)
  ChecksumMismatch
}

pub fn validate(isbn: String) -> Result(List(Int), IsbnError)
```

去掉所有连字符（`-`）后，按下面的顺序检查，返回第一个未通过的检查的错误。

1. **长度**：字符数不是 10 时，返回 `WrongLength(字符数)`。
2. **字符**：前 9 个字符必须是数字，最后一个字符必须是数字或大写 `X`（值为 10）。否则返回 `InvalidCharacter(position, found)`。`position` 是**去掉连字符后**从 0 开始数的位置；有多个时取最前面的字符。
3. **加权和**：`d₁×10 + d₂×9 + … + d₁₀×1` 不能被 11 整除时，返回 `ChecksumMismatch`。

全部通过时，以 `Ok` 返回 10 个字符值的列表。

```gleam
validate("3-598-21507-X")  // -> Ok([3, 5, 9, 8, 2, 1, 5, 0, 7, 10])
validate("3-598-P1581-X")  // -> Error(InvalidCharacter(position: 4, found: "P"))
validate("3-598-21507")    // -> Error(WrongLength(9))
```
