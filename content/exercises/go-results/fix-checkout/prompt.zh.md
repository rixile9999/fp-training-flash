网店的结账函数 `checkout` 有一个 bug：没有库存的商品也会完成支付。请修复代码。

```gleam
pub type Status {
  Draft
  Paid
}

pub type Order {
  Order(id: Int, amount: Int, status: Status)
}

pub fn checkout(
  order: Order,
  check_stock: fn(Order) -> Result(Order, String),
  apply_points: fn(Order) -> Order,
  charge: fn(Order) -> Result(Order, String),
) -> Result(Order, String)
```

正确的行为如下。

1. 用 `check_stock` 检查库存。失败时原样返回该错误，不执行之后的步骤。
2. 用 `apply_points` 对库存检查返回的订单使用积分。这一步不会失败。
3. 用 `charge` 为已使用积分的订单付款。失败时原样返回该错误。
4. 全部成功时，把支付返回的订单的 `status` 改为 `Paid`，以 `Ok` 返回。

```gleam
checkout(Order(1, 10_000, Draft), fn(_) { Error("库存不足") }, apply_points, charge)
// -> Error("库存不足")
```
