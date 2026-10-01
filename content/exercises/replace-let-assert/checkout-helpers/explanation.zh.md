当 `let assert` 位于辅助函数内部时，要修改的范围就更大了。`parse_line` 的返回类型 `#(String, Int)` 表示“总是成功”，所以没有通报失败的通道。因此题解**从最里层开始修改类型。**

1. `price_of` 返回 `Result(Int, CheckoutError)`。只需把 `dict.get` 的 `Error(Nil)` 换成 `UnknownSku(sku)`。
2. `parse_line` 用 `case string.split(line, " x ")` 检查段数以生成 `BadLine`，并把数量的解析和范围检查拆分到 `parse_quantity` 中，由它生成 `BadQuantity`。
3. `line_total` 用 `use ... <- result.try(...)` 串联两个辅助函数。它们的顺序就是检查的顺序。
4. `cart_total` 中 `fold` 里的 `let assert` 改成 `list.try_fold`。只要某一行得到 `Error`，就在那里停下，该错误就是结果。

失败的可能性一旦体现在类型中，编译器就会要求所有调用处都进行处理。把辅助函数改为返回 `Result` 的那一刻，`line_total` 就无法通过编译，于是编译器会告诉你遗漏了哪些地方。把偏函数变成全函数的这一过程是**全函数与偏函数（total-vs-partial-functions）**主题，用 `use` 和 `try_fold` 把失败继续传递下去的做法是**串联 Result 与单子（monad）**主题。

常见错误：

- 为了消除崩溃，用 `result.unwrap(0)` 把不存在的商品按 0 韩元处理。支付金额会悄悄出错。
- 在 `cart_total` 中用 `result.values` 只把成功的行相加。错误的行被悄悄排除在合计之外，结账照常进行。
- 只删掉 `let assert True = quantity >= 1`，却没有把范围检查移到别处。
