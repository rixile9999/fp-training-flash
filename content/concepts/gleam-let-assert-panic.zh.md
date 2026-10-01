---
id: gleam-let-assert-panic
title: let assert、panic、todo
---
下面这些语法在条件不满足时都会**立即终止**当前进程。所以只把它们用在“绝不应该发生”的情况，
可以预见的失败要用 `Result` 返回。

| 语法 | 何时终止 | 适用场景 |
|---|---|---|
| `let assert [first, ..] = xs` | 值与模式不匹配时 | 取出前面步骤已经保证的形状；测试 |
| `let assert Ok(n) = r as "消息"` | 同上，并附带消息 | 想在日志中记录失败原因时 |
| `panic as "消息"` | 执行到这一行时总会终止 | 逻辑上不可能到达的分支 |
| `todo as "消息"` | 执行到这一行时总会终止（有编译警告） | 尚未编写部分的占位 |
| `assert 表达式` | 表达式为 `False` 时 | 测试中的断言 |

```gleam
pub fn first_or_crash(xs: List(Int)) -> Int {
  let assert [first, ..] = xs as "不可能传入空列表"
  first
}

pub fn grade_label(score: Int) -> String {
  case score {
    s if s >= 90 -> "A"
    s if s >= 0 -> "B"
    _ -> panic as "分数应该已在校验阶段被限制为 0 以上"
  }
}
```

`let assert` 和 `panic` 不会把错误体现在类型中，所以调用方无从得知调用可能失败。
如果失败本身就是正常结果之一（比如输入校验），就使用 `Result`。

常见错误：解析用户输入时写 `let assert Ok(n) = int.parse(text)`。一个错误输入就会让进程终止，
应改为用 `case` 或 `result.try` 返回 `Error`。
