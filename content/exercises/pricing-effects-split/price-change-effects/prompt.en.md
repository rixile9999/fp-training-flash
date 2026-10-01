`update_price`, which changes a product's price, prints the change log and customer notifications right in the middle of its calculation. So that tests can check who gets which notification, write pure functions that **return the effects as values instead of running them**.

```gleam
pub type Effect {
  Log(message: String)
  Notify(customer: String, message: String)
}
```

1. `drop_percent(old_price: Int, new_price: Int) -> Int`
   - `(old_price - new_price) * 100 / old_price` (fractional part dropped)
   - 0 if the price stays the same or goes up, or if `old_price` is 0 or less
2. `change_price(product: Product, new_price: Int, watchers: List(String)) -> #(Product, List(Effect))`
   - First value: the product with only its price changed to `new_price`
   - First element of the effect list: `Log("<sku> 가격 변경: <old price> -> <new price>")`
   - If the drop rate is **20 or more**, follow it with `Notify(customer, "<sku> 가격이 <drop rate>% 내렸습니다")` for each customer, in the order of `watchers`

The messages are in Korean: `가격 변경` means "price change", and `가격이 N% 내렸습니다` means "price dropped by N%". The tests compare the text exactly, so write it as it is.

Change `update_price` into a thin function that calls `change_price` and runs (prints) the effects (not tested).

```gleam
change_price(Product("SKU-1", 10_000), 7500, ["kim", "lee"])
// -> #(Product("SKU-1", 7500), [
//      Log("SKU-1 가격 변경: 10000 -> 7500"),
//      Notify("kim", "SKU-1 가격이 25% 내렸습니다"),
//      Notify("lee", "SKU-1 가격이 25% 내렸습니다"),
//    ])
```
