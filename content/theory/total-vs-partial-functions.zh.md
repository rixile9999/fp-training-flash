---
id: total-vs-partial-functions
title: 全函数与偏函数
---
**全函数**（total function）对参数类型中的每一个输入，都返回结果类型的值。**偏函数**（partial function）对某些输入无法返回值：要么中止执行（`panic`、`let assert` 失败），要么永不结束。

签名为 `fn(List(Int)) -> Int` 的函数如果在空列表上 `panic`，类型说的是“给我任何列表，我都给你一个整数”，实际上却是假话。调用方只看签名察觉不到这个风险，编译器也帮不上忙。把偏函数变成全函数有两种方法。

**1. 放宽结果。** 在结果类型中表明可能没有值。标准库的 `list.first` 返回 `Result(a, Nil)` 就是这个原因。

```gleam
import gleam/int
import gleam/list

pub fn average(xs: List(Int)) -> Result(Int, Nil) {
  case xs {
    [] -> Error(Nil)
    _ -> Ok(int.sum(xs) / list.length(xs))
  }
}
```

现在调用方不处理 `Error` 就取不出平均值。失败的可能性随着类型一起传播。

**2. 收窄输入。** 接收一种从根本上无法构造出问题输入的类型。用类型表示非空列表，最大值就一定存在。

```gleam
import gleam/int
import gleam/list

pub type NonEmpty(a) {
  NonEmpty(first: a, rest: List(a))
}

pub fn maximum(xs: NonEmpty(Int)) -> Int {
  list.fold(xs.rest, xs.first, int.max)
}
```

收窄输入的方式把检查集中到一处（创建值的边界）。在边界上用 `Result` 校验一次并构造出 `NonEmpty`，之后的函数就不必重复同样的检查。

## 也要警惕悄无声息的默认值

Gleam 的整数除法 `/` 除以 0 时返回 0 而不是错误（浮点除法 `/.` 也返回 0.0）。函数因此成了全函数，却再也分不清“除以了零”和“真实结果就是 0”。如果失败是有意义的，最好像 `int.divide` 那样返回 `Result`。用随意的默认值掩盖错误，并不是在构造全函数，而是在隐藏失败。

`let assert` 和 `panic` 只在“这种情况绝不会发生”这一不变式已经由代码保证时才使用。用户输入、文件内容、外部响应这类从边界进入的值随时都可能出错，所以要用 `Result` 来处理。

## 这个概念用在哪里

- 为空列表、不存在的键、除以零、解析失败这类“可能没有值”的操作决定返回类型时。
- 把 `let assert` 重构为 `case` 或 `Result` 时。
- 用专门的类型表示已校验的值，从而收窄后续函数的输入时。
