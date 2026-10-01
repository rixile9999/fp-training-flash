实现 `parse_line`，把订单文件中的一行 `"订单号,商品编码,数量"` 转换成 `OrderLine`。失败时用 `ParseError` 说明哪里出了问题。

```gleam
pub type OrderLine {
  OrderLine(order_id: Int, sku: String, quantity: Int)
}

pub type ParseError {
  WrongFieldCount(Int)
  InvalidOrderId(String)
  EmptySku
  InvalidQuantity(String)
}

pub fn parse_line(line: String) -> Result(OrderLine, ParseError)
```

- 用逗号（`,`）拆分这一行，去掉每个字段首尾的空白后再解析。
- 字段不是正好 3 个时，返回 `WrongFieldCount(实际字段个数)`。
- 订单号不是整数时，返回 `InvalidOrderId(字段)`。
- 商品编码（SKU）是空字符串时，返回 `EmptySku`。
- 数量不是整数或小于 1 时，返回 `InvalidQuantity(字段)`。
- 错误中放入的字段是去掉空白后的值。
- 检查顺序是字段个数、订单号、商品编码、数量。只返回最先发现的一个错误。

```gleam
parse_line(" 1001 , APPLE-01 , 3")  // -> Ok(OrderLine(1001, "APPLE-01", 3))
parse_line("1001,APPLE-01,0")       // -> Error(InvalidQuantity("0"))
```
