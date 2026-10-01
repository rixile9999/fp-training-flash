实现 `parse_refund`，把客服中心收到的一行退款申请 `"订单号:金额:原因"` 转换成 `RefundRequest`。

```gleam
pub type Reason {
  Damaged
  Late
  WrongItem
}

pub type RefundRequest {
  RefundRequest(order_id: Int, amount: Int, reason: Reason)
}

pub type RefundError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  InvalidAmount(String)
  UnknownReason(String)
}

pub const max_amount = 1_000_000

pub fn parse_refund(line: String) -> Result(RefundRequest, RefundError)
```

- 用冒号（`:`）拆分这一行，并去掉每个字段首尾的空白。字段不是正好 3 个时，返回 `WrongFieldCount(实际个数)`。
- 订单号不是整数时，返回 `InvalidOrderId(字段)`。
- 金额必须是大于等于 1 且小于等于 `max_amount`（1,000,000）的整数，否则返回 `InvalidAmount(字段)`。
- 原因是 `damaged`、`late`、`wrong_item` 之一，不区分大小写，分别变成 `Damaged`、`Late`、`WrongItem`。其他原因返回 `UnknownReason(字段)`，字段只去掉首尾空白，不改变大小写。
- 检查顺序是字段个数、订单号、金额、原因。只返回最先发现的一个错误。

```gleam
parse_refund("1001:15000:damaged")  // -> Ok(RefundRequest(1001, 15000, Damaged))
parse_refund("1001:15000:Refused")  // -> Error(UnknownReason("Refused"))
```
