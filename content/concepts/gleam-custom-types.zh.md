---
id: gleam-custom-types
title: 自定义类型
---
自定义类型用类型来表达“这个值**恰好是**这几种形状中的一种”。每种形状（variant）都是一个构造器，并且可以带有字段。

| 语法 | 示例 | 含义 |
|---|---|---|
| 多个 variant | `type Grade { Basic Vip }` | 二者之一 |
| 记录（带标签字段） | `Customer(name: String, grade: Grade)` | 一组有名字的字段 |
| 读取字段 | `customer.name` | 只有一个 variant 时，或者所有 variant 都有标签和类型相同的该字段时，可以用 `.` 读取 |
| 用模式取出 | `Points(amount:)` | 把字段取到同名变量中 |
| 忽略字段 | `Card(..)` | 只确认 variant，忽略字段 |
| 可见范围 | `pub type`、`pub opaque type` | 如果是 opaque，模块外部就不能使用其构造器、模式和字段 |

```gleam
pub type Payment {
  Card(number: String)
  Cash
  Points(amount: Int)
}

pub fn fee(payment: Payment) -> Int {
  case payment {
    Card(..) -> 300
    Cash -> 0
    Points(amount:) -> amount / 100
  }
}
// fee(Points(1500)) == 15

pub type Grade {
  Basic
  Vip
}

pub type Customer {
  Customer(name: String, grade: Grade)
}

pub fn greeting(customer: Customer) -> String {
  case customer.grade {
    Vip -> customer.name <> "，您的 VIP 福利已送达"
    Basic -> customer.name <> "，您好"
  }
}
// greeting(Customer(name: "小明", grade: Vip)) == "小明，您的 VIP 福利已送达"
```

与其用 `Bool` 或 `String` 来标记状态，不如拆分成 variant：这样根本无法构造出不可能的组合，
而且 `case` 中漏掉的情况会由编译器告诉你。

常见错误：在 `case` 中用 `_ ->` 把剩下的情况一并处理。这样以后新增 variant 时，编译器就无法提醒你漏掉了处理，
所以尽量把每个 variant 都逐一写出来。
