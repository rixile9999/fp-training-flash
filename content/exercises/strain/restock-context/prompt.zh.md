从便利店的库存列表中挑选需要补货的商品。过滤函数 `keep(items, predicate)` 已经完成。请编写组装条件函数的函数，以及使用它们的函数。

```gleam
pub type Product {
  Product(name: String, stock: Int, active: Bool)
}
```

1. `both(p, q)`：返回一个新的条件函数，只有两个条件 **都** 为真时才为真。
2. `negate(p)`：返回一个与 `p` 结果相反的新条件函数。
3. `needs_restock(products, threshold)`：按原来的顺序返回在售（`active` 为 `True`）且库存 **少于** `threshold`（相等时不算）的商品。
4. `discontinued(products)`：按原来的顺序返回已停售（`active` 为 `False`）的商品。

`needs_restock` 和 `discontinued` 请用 `keep` 和上面两个函数来实现。不要使用 `list.filter`。

```gleam
needs_restock([Product("牛奶", 2, True), Product("面包", 30, True), Product("豆奶", 0, False)], 5)
// -> [Product("牛奶", 2, True)]
```
