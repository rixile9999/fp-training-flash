---
id: gleam-anonymous-functions
title: 匿名函数与函数捕获
---
在 Gleam 中，函数就是值。你可以不起名字、就地创建一个函数，也可以把已有的函数原样传出去。

| 语法 | 示例 | 含义 |
|---|---|---|
| 匿名函数 | `fn(x) { x * 2 }` | 接收参数 `x`，返回 `x * 2` |
| 类型标注 | `fn(x: Int) -> Int { x * 2 }` | 写明参数和返回值类型的形式 |
| 函数引用 | `int.to_string` | 把已有函数当作值传递 |
| 捕获 | `int.add(_, 10)` | `fn(x) { int.add(x, 10) }` 的简写 |
| 闭包 | `fn(p) { p * rate }` | 记住外部变量 `rate` |
| 函数类型 | `fn(Int) -> Int` | 接收或返回函数时使用的类型 |

```gleam
import gleam/int
import gleam/list

pub fn multiplier(n: Int) -> fn(Int) -> Int {
  fn(x) { x * n }
}

pub fn examples() {
  let rate = 10
  let discount = fn(price) { price - price * rate / 100 }
  list.map([1000, 2000], discount)    // [900, 1800]
  list.map([1, 2], int.to_string)     // ["1", "2"]
  list.map([1, 2], int.add(_, 10))    // [11, 12]
  list.map([1, 2], multiplier(3))     // [3, 6]
}
```

像 `multiplier(3)` 这样根据配置值预先生成函数，就能把同一条规则传到多个地方重复使用。

常见错误：想用捕获 `_` 写出多步计算。捕获只能把**一次调用**变成函数。
`int.add(_, 1) * 2` 并不是“先加 1 再乘 2 的函数”，而是拿一个函数去乘 2，所以会产生类型错误；
像 `int.add(_, _)` 这样留两个空位也无法编译。如果不止一次调用，就写成 `fn(x) { int.add(x, 1) * 2 }`。
