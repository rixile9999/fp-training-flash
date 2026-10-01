你要为一台通过多次变换数据来加密的设备编写软件。需要编写简单的运算函数，并能把它们连接起来组成复杂的运算。所有函数返回的都不是数字，而是**函数**。

- `secret_add(secret)`：给输入 `x` 加上 `secret` 的函数（`x + secret`）
- `secret_subtract(secret)`：从输入 `x` 中减去 `secret` 的函数（`x - secret`）
- `secret_multiply(secret)`：把输入 `x` 乘以 `secret` 的函数（`x * secret`）
- `secret_divide(secret)`：用 `secret` 对输入 `x` 做整数除法的函数（`x / secret`，舍去小数部分）
- `secret_combine(f, g)`：先对输入 `x` 应用 `f`，再对其结果应用 `g` 的函数

```gleam
let multiply = secret_multiply(7)
let divide = secret_divide(3)
let combined = secret_combine(multiply, divide)
combined(6)
// -> 14  (6 * 7 = 42, 42 / 3 = 14)
```
