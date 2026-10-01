账单计算已经拆成了步骤函数，但收到了客户反馈：批量订单、正好 5 万韩元的订单以及空账单的总额都算错了。步骤函数全都是正确的。请修复 `invoice_total`。

规则（已在步骤函数中实现）：

- `line_amount`：`unit_price * quantity`，数量在 10 及以上时该行打 9 折（不足 1 韩元的部分舍去）
- `subtotal`：所有行的 `line_amount` 之和
- `shipping_fee(amount)`：0 韩元时为 0，50,000 韩元及以上时为 0，其他情况为 3,000
- `vat(amount)`：`amount / 10`
- `invoice_total`：`小计 + vat(小计) + shipping_fee(小计)`

```gleam
invoice_total([Line("B-7", 1000, 12)])
// -> 14880  (10800 + 1080 + 3000)
```
