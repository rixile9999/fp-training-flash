---
id: algebraic-data-types
title: 和类型与穷尽匹配
---
类型由两种组合值的方式构成。

- **积类型**：**同时**拥有多个值。`Order(id: Int, status: Status, amount: Int)` 同时拥有三个字段。
- **和类型**：是多种情况中的**恰好一种**。`Status` 是 `Pending`、`Shipped`、`Cancelled` 之一。

把两者组合起来的类型叫作代数数据类型。数一数可能的值有多少个，就能看出名字的由来：积类型把各字段的可能数相乘，和类型则相加。

```gleam
pub type Status {
  Pending
  Shipped
  Cancelled
}

fn label(status: Status) -> String {
  case status {
    Pending -> "待发货"
    Shipped -> "已发货"
    Cancelled -> "已取消"
  }
}
```

Gleam 编译器会检查 `case` 是否覆盖了和类型的所有情况。新增一个状态时，它会把漏掉的分支报告为编译错误。用 `_ ->` 一次性接住其余情况，就等于自己关掉了这项检查。

## 这个概念用在哪里

- 需要按状态分别处理时，用 `case` 明确写出所有情况。
- `Option(a)` 和 `Result(a, e)` 也是和类型，它们是用类型表达失败的基础。
