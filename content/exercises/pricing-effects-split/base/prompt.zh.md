门店收银台的 `checkout` 在计算合计的过程中，直接用 `io.println` 打印收据行。因此无法测试收据的内容。请把计算和输出分开。下面三个函数 **不打印任何东西**，只返回值。

1. `line_log(item: Item) -> String`
   - 形如 `"<name> x<quantity> = <price * quantity>"` 的字符串。例：`"苹果 x3 = 3000"`
2. `quote(items: List(Item)) -> Quote`
   - `total`：所有商品的 `price * quantity` 之和
   - `log`：把每个商品的 `line_log` 结果 **按输入顺序** 排列，最后再加上一行 `"합계 = <total>"` 的列表
   - 没有商品时为 `Quote(total: 0, log: ["합계 = 0"])`
3. `render(quote: Quote) -> String`
   - 用 `"\n"` 连接 `log` 中各行得到的字符串。最后一行后面不加换行符。

`합계` 是韩文的“合计”。测试会精确比对文本，所以请原样写 `"합계 = "`。

把 `checkout` 改成一个很薄的函数：调用 `quote` 和 `render`，打印一次，然后返回 `total`（不测试）。

```gleam
quote([Item("苹果", 1000, 3), Item("梨", 2500, 2)])
// -> Quote(total: 8000, log: ["苹果 x3 = 3000", "梨 x2 = 5000", "합계 = 8000"])
```
