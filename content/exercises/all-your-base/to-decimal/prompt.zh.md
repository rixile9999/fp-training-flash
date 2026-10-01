这是进制转换的第一步。实现 `from_digits`：接收 `base` 进制的数字位列表，返回这个数的值。

```gleam
pub type RebaseError {
  InvalidBase(Int)
  InvalidDigit(Int)
}

pub fn from_digits(digits: List(Int), base: Int) -> Result(Int, RebaseError)
```

- `digits` 从高位到低位排列。空列表的值是 0。
- 转换要自己实现（不要使用 `int.undigits`）。
- 如果 `base` 小于 2，不看数字位，直接返回 `Error(InvalidBase(base))`。
- 如果某个数字位小于 0 或大于等于 `base`，返回 `Error(InvalidDigit(该数字位))`。有多个错误数字位时，报告最前面的那个。

```gleam
from_digits([1, 0, 1], 2)  // -> Ok(5)
from_digits([1, 2, 1], 2)  // -> Error(InvalidDigit(2))
```
