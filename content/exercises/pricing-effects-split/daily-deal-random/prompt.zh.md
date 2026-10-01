网店的“今日特价”会随机挑一个商品打折。现有的 `pick_daily_deal` 把调用 `int.random` 的代码和折扣计算混在一个函数里，结果每次都不同，无法测试。请把随机选择推到外面，把计算写成纯函数。

1. `deal_price(price: Int) -> Int`
   - 取打 7 折后的价格（`price * 70 / 100`），并 **按 100 韩元向下取整**。
2. `apply_deal(products: List(Product), index: Int) -> List(Product)`
   - 只把位置 `index`（从 0 开始计数）上的商品价格改为 `deal_price`，其余商品和顺序保持不变。
   - 如果 `index` 为负数，或大于等于列表长度，原样返回列表。

把 `pick_daily_deal` 改成一个很薄的函数：用 `int.random` 选出位置，再调用 `apply_deal`（因为是随机的，所以不测试）。

```gleam
apply_deal([Product("橘子", 10_000), Product("苹果", 12_345), Product("梨", 5000)], 1)
// -> [Product("橘子", 10_000), Product("苹果", 8600), Product("梨", 5000)]
```
