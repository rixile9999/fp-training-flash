模块里已经有解析一行订单 `"订单号,商品编码,数量"` 的 `parse_line`（成功时返回 `OrderLine`，失败时返回 `ParseError`）。请利用它实现 `parse_batch`，解析由多行组成的整个订单文件。

```gleam
// 已提供
pub fn parse_line(line: String) -> Result(OrderLine, ParseError)

// 需要编写的部分
pub type BatchError {
  LineError(line_number: Int, error: ParseError)
}

pub fn parse_batch(text: String) -> Result(List(OrderLine), BatchError)
```

- 用换行符（`"\n"`）拆分文本。
- 去掉首尾空白后为空的行要跳过。空字符串返回 `Ok([])`。
- 所有行都成功时，按文件中的行顺序返回 `Ok(列表)`。
- 有行失败时，对最靠前的出错行返回 `Error(LineError(行号, parse_line 的错误))`。
- 行号从 1 开始计，跳过的空行也计入行号（即原文件中的行号）。

```gleam
parse_batch("1001,APPLE-01,3\n\nx,PEAR-02,1")
// -> Error(LineError(3, InvalidOrderId("x")))
```
