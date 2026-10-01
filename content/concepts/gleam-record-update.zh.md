---
id: gleam-record-update
title: 记录更新语法
---
`Order(..order, amount: 9000)` 会创建一个只修改了 `order` 中 `amount` 的**新**记录。原来的 `order` 不会改变。

```gleam
pub type Order {
  Order(id: Int, amount: Int)
}

let a = Order(id: 1, amount: 10_000)
let b = Order(..a, amount: 9000)
// a.amount == 10_000, b.amount == 9000
```

使用更新语法而不是把所有字段重写一遍，这样以后即使新增字段，代码也能照常工作。
