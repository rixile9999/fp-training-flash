修改商品价格的 `update_price` 在计算过程中直接打印变更记录和顾客通知。为了让测试能检查谁会收到什么通知，请编写 **不执行效应、而是把效应作为值返回** 的纯函数。

```gleam
pub type Effect {
  Log(message: String)
  Notify(customer: String, message: String)
}
```

1. `drop_percent(old_price: Int, new_price: Int) -> Int`
   - `(old_price - new_price) * 100 / old_price`（小数部分舍去）
   - 价格不变或上涨，或者 `old_price` 小于等于 0 时为 0
2. `change_price(product: Product, new_price: Int, watchers: List(String)) -> #(Product, List(Effect))`
   - 第一个值：只把价格改为 `new_price` 的商品
   - 效应列表的第一个元素：`Log("<sku> 가격 변경: <原价格> -> <新价格>")`
   - 如果降价率 **大于等于 20**，接着按 `watchers` 的顺序为每位顾客生成 `Notify(顾客, "<sku> 가격이 <降价率>% 내렸습니다")`

消息是韩文：`가격 변경` 意为“价格变更”，`가격이 N% 내렸습니다` 意为“价格下降了 N%”。测试会精确比对文本，所以请原样书写。

把 `update_price` 改成一个很薄的函数：调用 `change_price` 并执行（打印）这些效应（不测试）。

```gleam
change_price(Product("SKU-1", 10_000), 7500, ["kim", "lee"])
// -> #(Product("SKU-1", 7500), [
//      Log("SKU-1 가격 변경: 10000 -> 7500"),
//      Notify("kim", "SKU-1 가격이 25% 내렸습니다"),
//      Notify("lee", "SKU-1 가격이 25% 내렸습니다"),
//    ])
```
