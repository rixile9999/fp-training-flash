---
id: errors-as-values
title: 错误也是值
---
Gleam 没有为可预期的失败准备异常。可能失败的函数返回 `Result(a, e)`，失败就是 `Error(e)` 这样一个**普通的值**。这个选择带来三个好处。

- **签名是诚实的**：只看返回类型，就知道这个函数会不会失败、以什么方式失败。
- **不会忘记处理**：要使用 `Result(Int, e)` 里的 `Int`，就必须用 `case` 或 `result` 模块的函数把它取出来。忽略失败路径，类型就对不上。
- **可以操作错误**：错误是值，所以可以比较、做模式匹配、收集到列表里，也可以在测试里用 `should.equal` 检查。

## 设计错误类型

错误值要有用，就得是调用方**能够据此分支**的形状。基本做法是用和类型，为每种失败原因设一个构造器。

```gleam
import gleam/int

pub type QuantityError {
  NotANumber(input: String)
  NotPositive(value: Int)
}

pub fn parse_quantity(input: String) -> Result(Int, QuantityError) {
  case int.parse(input) {
    Error(Nil) -> Error(NotANumber(input))
    Ok(n) if n <= 0 -> Error(NotPositive(n))
    Ok(n) -> Ok(n)
  }
}
```

调用方可以针对不同原因做出不同反应，编译器会检查是否处理了所有构造器。

```gleam
pub fn message(input: String) -> String {
  case parse_quantity(input) {
    Ok(n) -> "已加入 " <> int.to_string(n) <> " 件"
    Error(NotANumber(_)) -> "请输入数字"
    Error(NotPositive(_)) -> "请输入 1 或以上的数"
  }
}
```

如果失败原因只有一种，`Result(a, Nil)` 就够了（`int.parse`、`list.first`）。如果原因有好几种却都揉成 `Nil` 或 `String`，信息就丢失了。`String` 错误便于人阅读，但调用方只能靠比较字符串来分支，很脆弱。提示文案应该在最外层根据错误值来生成。

## 常见错误

- 像 `result.unwrap(r, 0)` 这样把错误换成默认值吞掉。失败这一事实消失了，0 会像正常结果一样流下去。
- 原因不同的失败却返回同一个构造器。测试会检查到底是**哪一种**错误，比如 `Error(NotPositive(0))`。
- 对可预期的输入错误使用 `panic` 或 `let assert`。

BEAM 的“let it crash”（任其崩溃）理念与此并不冲突。那是在出现 bug 或意料之外的状态时重启进程的策略。用户输错的数量是意料之中的结果，所以要作为值返回。

## 这个概念用在哪里

- 决定输入解析和校验函数的返回类型时。
- 把多个步骤的失败汇总成一种错误类型，并用 `result.try` 串联时（参见“串联 Result 与单子”）。
- 按错误种类生成不同的提示信息或 HTTP 状态码时。
