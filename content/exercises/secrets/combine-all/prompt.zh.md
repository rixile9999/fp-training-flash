加密设备现在以设置列表的形式接收多步运算。`secret_add`、`secret_subtract`、`secret_multiply`、`secret_divide`、`secret_combine` 已经在初始代码中实现好了。请添加两个函数。

1. `secret_combine_all(fns: List(fn(Int) -> Int)) -> fn(Int) -> Int`
   - 返回一个**从列表的第一个函数开始**依次应用的函数。
   - 空列表时，返回原样返回输入的函数。
2. `secret_repeat(f: fn(Int) -> Int, times: Int) -> fn(Int) -> Int`
   - 返回把 `f` 连续应用 `times` 次的函数。
   - `times` 小于等于 0 时，返回原样返回输入的函数。

尽量复用已有的 `secret_combine` 和 `secret_combine_all`。

```gleam
let f = secret_combine_all([secret_add(2), secret_multiply(10), secret_subtract(1)])
f(1)   // -> 29  ((1 + 2) * 10 - 1)

let g = secret_repeat(secret_multiply(2), 3)
g(1)   // -> 8
```
