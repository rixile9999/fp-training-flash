bug 就在 `result.unwrap(check_stock(order), order)` 这一行。`unwrap` 会把 `Error` 换成默认值，所以即使库存检查失败，代码也会带着原来的订单进入下一步。“库存不足”这一信息就在这一行消失了。

修复后的代码用 `use` 和 `result.try`，只有成功时才继续执行下一行。

```gleam
use checked <- result.try(check_stock(order))
let discounted = apply_points(checked)
use charged <- result.try(charge(discounted))
Ok(Order(..charged, status: Paid))
```

`use checked <- result.try(r)` 的意思是：“如果 `r` 是 `Ok(checked)`，就继续执行下面的行；如果是 `Error`，就立即把这个 `Error` 作为本函数的结果返回”。因此代码看起来只是从上到下写出了成功路径，失败处理交给 `result.try`。使用积分不会失败，所以用普通的 `let` 来写。

修复时常见的错误有三种。

- 用 `use _ <- result.try(check_stock(order))` 只确认是否成功，却把原来的 `order` 传给下一步。如果库存检查步骤修改了订单再返回（例如加上包装费），这个修改就会丢失。`Ok` 里的值才是下一步的输入。
- 先把库存结果单独存起来，到最后再和支付结果一起检查。如果先检查支付，那么库存和支付都失败时会返回“银行卡授权被拒”。实际上等于在没有库存的情况下还尝试了付款。
- 先付款、后使用积分。步骤顺序一变，支付金额也会变。

这和基础题中的围棋规则是同样的结构：按顺序串联可能失败的步骤，在第一次失败时停下。这种形状在理论笔记“错误也是值”（errors-as-values）中有更多介绍。
