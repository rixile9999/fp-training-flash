`both` 和 `negate` 是接收条件函数、返回 **新条件函数** 的函数。它们返回的匿名函数会记住外层的参数 `p`、`q`，所以之后收到元素时能计算两个条件。

```gleam
pub fn both(p, q) { fn(item) { p(item) && q(item) } }
pub fn negate(p) { fn(item) { !p(item) } }
```

能这样组装条件后，过滤逻辑（`keep`）只需写一次，业务规则则用条件的组合来表达。

```gleam
keep(products, both(is_active, fn(product) { product.stock < threshold }))
keep(products, negate(is_active))
```

“怎么过滤”和“过滤什么”被分开了，即使规则变化，`keep` 也保持不变。把小函数当作值传递并加以组合来编写程序，这种方式在理论笔记 higher-order-modularity（高阶函数与模块化）中讨论。

常见错误有两种：

- 在 `both` 中使用 `||`，把已停售的商品也列入了补货对象。
- 把基准比较写成 `<=`，把库存等于基准的商品也算了进去。题目中的“少于”指严格小于。
