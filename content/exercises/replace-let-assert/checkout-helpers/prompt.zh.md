这是计算购物车金额的模块。公开函数 `line_total` 和 `cart_total` 返回 `Result`，但内部的辅助函数 `parse_line` 和 `price_of` 会因 `let assert` 而崩溃，`cart_total` 也用 `let assert` 取出每一行的结果。只要有一行出错，整个结账请求就会崩溃。

请去掉所有 `let assert`，把失败以 `CheckoutError` 值一路传递到公开函数。辅助函数的签名可以修改。

```gleam
pub type CheckoutError {
  BadLine(String)
  BadQuantity(String)
  UnknownSku(String)
}

pub fn line_total(prices: Dict(String, Int), line: String) -> Result(Int, CheckoutError)
pub fn cart_total(prices: Dict(String, Int), lines: List(String)) -> Result(Int, CheckoutError)
```

- 订单行的格式是 `"SKU x 数量"`。按 `" x "` 拆分后如果不是正好两段，返回 `Error(BadLine(整行))`。
- 数量不是整数或小于 1 时，返回 `Error(BadQuantity(数量部分))`。
- 商品不在价格表中时，返回 `Error(UnknownSku(商品编码))`。
- 检查顺序是行格式、数量、商品。
- `cart_total` 按行的顺序计算，如果有失败的行，返回第一个失败的错误。空购物车为 `Ok(0)`。

```gleam
// 价格表：APPLE=1200, PEAR=2500
line_total(prices, "APPLE x 3")               // -> Ok(3600)
cart_total(prices, ["APPLE x 1", "KIWI x 2"]) // 现在：崩溃   修复后：Error(UnknownSku("KIWI"))
```
