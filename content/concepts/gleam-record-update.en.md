---
id: gleam-record-update
title: Record update syntax
---
`Order(..order, amount: 9000)` creates a **new** record that is `order` with only `amount` changed. The original `order` stays the same.

```gleam
pub type Order {
  Order(id: Int, amount: Int)
}

let a = Order(id: 1, amount: 10_000)
let b = Order(..a, amount: 9000)
// a.amount == 10_000, b.amount == 9000
```

If you use the update syntax instead of writing out every field again, your code keeps working even when fields are added later.
