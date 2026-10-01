---
id: chaining-results-monads
title: 串联 Result 与单子
---
我们经常需要把几个可能失败的步骤串起来：解析数量，解析价格，检查上限。直接用 `case` 写的话，每多一步缩进就深一层，而且每一层都重复着同样的代码：“如果是 `Error` 就原样返回”。

把这个重复部分提取出来，就是 `result.try`。

```text
result.try(Result(a, e), fn(a) -> Result(b, e)) -> Result(b, e)
```

如果第一个结果是 `Ok(x)`，就把 `x` 交给下一步；如果是 `Error(e)`，就不调用下一步，直接原样返回 `Error(e)`（短路求值）。使用 `use` 表达式时，代码块的剩余部分会成为回调，读起来是平的。

```gleam
import gleam/int
import gleam/result

pub type OrderError {
  BadQuantity(String)
  BadPrice(String)
  OverLimit(Int)
}

pub fn order_total(quantity: String, price: String) -> Result(Int, OrderError) {
  use q <- result.try(
    int.parse(quantity) |> result.replace_error(BadQuantity(quantity)),
  )
  use p <- result.try(int.parse(price) |> result.replace_error(BadPrice(price)))
  check_limit(q * p)
}

fn check_limit(amount: Int) -> Result(Int, OrderError) {
  case amount > 1_000_000 {
    True -> Error(OverLimit(amount))
    False -> Ok(amount)
  }
}
```

`use p <- result.try(r)` 之后的几行，就相当于 `result.try(r, fn(p) { ... })` 的函数体。变的只是语法，它仍然是嵌套的回调。

## 为什么是单子

对固定了错误类型 `e` 的 `Result(_, e)` 来说，用 `Ok` 包装值的操作和 `result.try` 就是单子（monad）的两个操作（return 和 bind），并且满足以下三条定律。

- 左单位元：`result.try(Ok(x), f)` 等于 `f(x)`。
- 右单位元：`result.try(r, Ok)` 等于 `r`。
- 结合律：`result.try(result.try(r, f), g)` 等于 `result.try(r, fn(x) { result.try(f(x), g) })`。

这些定律是重构的依据。有了结合律，把串联中的一部分步骤抽出来另起一个有名字的函数，或者再内联回去，含义都不会改变。单位元定律则说明，最后只是用 `Ok` 包一下的步骤什么也没做。

## 区分 map 和 try，统一错误类型

下一步不会失败就用 `result.map`，可能失败（返回 `Result`）就用 `result.try`。把返回 `Result` 的函数传给 `map`，会得到 `Result(Result(b, e), e)` 这样嵌套的类型。这是最常见的错误。

所有步骤必须共用同一种错误类型。像 `int.parse` 这样返回 `Nil` 错误的函数，要先用 `result.replace_error` 或 `result.map_error` 转换成领域错误再串联。

`result.try` 在**第一个**错误处就停下。如果需要一次性显示所有输入字段的错误，就需要另一种结构：各项检查独立运行，并把错误收集到列表里。

## 这个概念用在哪里

- 串联解析、校验、查询、计算这类按顺序执行且可能失败的步骤时。
- 用 `use` 和 `result.try` 把嵌套 `case` 的金字塔重构成扁平代码时。
- `Option` 的 `option.then` 也是同样的形状：没有值就停下，有值就交给下一步。
