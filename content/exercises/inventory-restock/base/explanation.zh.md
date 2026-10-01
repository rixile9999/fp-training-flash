所有商品都必须保留在结果中，所以使用保持列表形状的 `list.map`。对每个商品只需要决定一件事：“要不要增加库存”，用 `case` 来区分。

要修改的值 `on_hand` 位于 `Item` 里的 `Stock` 里。Gleam 的值不会改变，所以“只修改内层字段”实际上是下面两步：

1. 用 `Stock(..stock, on_hand: stock.on_hand + stock.reorder_qty)` 创建新的 `Stock`。
2. 用 `Item(..item, stock: 新_stock)` 创建包含它的新 `Item`。

`..stock` 和 `..item` 会原样带上其余字段的值，所以不必重新写出名称或 `reorder_point` 这类字段，也不会不小心改错。没有改变的部分由新旧记录共同指向（理论笔记“不可变值与结构共享”）。

常见错误有三种：把条件写成 `<`，漏掉库存恰好等于再订货点的商品；用 `list.filter` 只留下需要补货的商品，丢掉了其余商品；以及像 `on_hand: stock.reorder_qty` 这样直接覆盖而不是相加。

把更新单个商品的部分拆成 `restock_item`，处理列表的代码就只表达“对所有商品应用同一条规则”这一点（理论笔记“保持结构的变换：函子”）。
