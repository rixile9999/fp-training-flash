An online store's "deal of the day" picks one product at random and discounts it. The existing `pick_daily_deal` mixes the code that calls `int.random` with the discount calculation in one function, so the result changes every time and it can't be tested. Push the random selection out and make the calculation a pure function.

1. `deal_price(price: Int) -> Int`
   - Take the price with a 30% discount (`price * 70 / 100`) and **round it down to the nearest 100 won**.
2. `apply_deal(products: List(Product), index: Int) -> List(Product)`
   - Change the price of only the product at position `index` (counting from 0) to `deal_price`, and leave the other products and the order as they are.
   - If `index` is negative or greater than or equal to the list length, return the list unchanged.

Change `pick_daily_deal` into a thin function that picks a position with `int.random` and then calls `apply_deal` (not tested, because it is random).

```gleam
apply_deal([Product("tangerine", 10_000), Product("apple", 12_345), Product("pear", 5000)], 1)
// -> [Product("tangerine", 10_000), Product("apple", 8600), Product("pear", 5000)]
```
