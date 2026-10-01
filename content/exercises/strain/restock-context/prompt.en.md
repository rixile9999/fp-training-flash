You are picking the products to restock from a convenience store's inventory list. The filtering function `keep(items, predicate)` is already complete. Write functions that assemble condition functions, and functions that use them.

```gleam
pub type Product {
  Product(name: String, stock: Int, active: Bool)
}
```

1. `both(p, q)`: return a new condition function that is true only when **both** conditions are true.
2. `negate(p)`: return a new condition function that gives the opposite result of `p`.
3. `needs_restock(products, threshold)`: return, in their original order, the products that are active (`active` is `True`) and whose stock is **less than** `threshold` (equal is excluded).
4. `discontinued(products)`: return, in their original order, the discontinued products (`active` is `False`).

Build `needs_restock` and `discontinued` with `keep` and the two functions above. Do not use `list.filter`.

```gleam
needs_restock([Product("milk", 2, True), Product("bread", 30, True), Product("soy milk", 0, False)], 5)
// -> [Product("milk", 2, True)]
```
