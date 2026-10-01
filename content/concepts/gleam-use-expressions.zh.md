---
id: gleam-use-expressions
title: use 表达式
---
`use` 是一种语法，让以回调作为最后一个参数的函数可以平铺着写。`use x <- f(a)` 下方代码块中的
**全部剩余部分**会成为回调 `fn(x) { ... }`，并以 `f(a, 回调)` 的形式被调用。

| 用 `use` 写的形式 | 展开后的形式 |
|---|---|
| `use x <- result.try(r)` + 剩余部分 | `result.try(r, fn(x) { 剩余部分 })` |
| `use x <- option.then(o)` + 剩余部分 | `option.then(o, fn(x) { 剩余部分 })` |
| `use <- bool.guard(when: c, return: v)` + 剩余部分 | `bool.guard(c, v, fn() { 剩余部分 })` |

```gleam
import gleam/bool
import gleam/int
import gleam/result

pub fn total_price(qty_text: String, price_text: String) -> Result(Int, Nil) {
  use qty <- result.try(int.parse(qty_text))
  use price <- result.try(int.parse(price_text))
  Ok(qty * price)
}
// total_price("3", "1500") == Ok(4500), total_price("x", "1500") == Error(Nil)

pub fn withdraw(balance: Int, amount: Int) -> Result(Int, String) {
  use <- bool.guard(when: amount <= 0, return: Error("金额必须为正数"))
  use <- bool.guard(when: amount > balance, return: Error("余额不足"))
  Ok(balance - amount)
}
```

与 `result.try` 搭配使用时，“前一步是 `Error` 就当场停下并返回该错误”的流程可以一行一行地读下来。
`bool.guard` 用来写出条件成立时提前返回的检查行。要缩小 `use` 的作用范围，就用 `{ ... }` 代码块把它包起来。

常见错误：最后一个表达式没有用 `Ok(...)` 包起来。最后一个表达式是回调的返回值，所以通过 `result.try` 串起来的代码块
必须返回 Result，要写 `Ok(qty * price)` 而不是 `qty * price`。
