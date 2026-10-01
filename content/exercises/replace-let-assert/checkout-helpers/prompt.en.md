This module calculates the amount of a shopping cart. The public functions `line_total` and `cart_total` return a `Result`, but the inner helpers `parse_line` and `price_of` crash on `let assert`, and `cart_total` also pulls out each line's result with `let assert`. A single invalid line kills the whole checkout request.

Remove every `let assert` and fix the code so that failures reach the public functions as `CheckoutError` values. You may change the signatures of the helper functions.

```gleam
pub type CheckoutError {
  BadLine(String)
  BadQuantity(String)
  UnknownSku(String)
}

pub fn line_total(prices: Dict(String, Int), line: String) -> Result(Int, CheckoutError)
pub fn cart_total(prices: Dict(String, Int), lines: List(String)) -> Result(Int, CheckoutError)
```

- An order line has the form `"SKU x quantity"`. If splitting on `" x "` does not give exactly two pieces, `Error(BadLine(whole line))`.
- If the quantity is not an integer or is less than 1, `Error(BadQuantity(quantity part))`.
- If the product is not in the price list, `Error(UnknownSku(product code))`.
- The checks run in this order: line format, quantity, product.
- `cart_total` calculates the lines in order, and if any line fails, returns the error of the first failure. An empty cart is `Ok(0)`.

```gleam
// price list: APPLE=1200, PEAR=2500
line_total(prices, "APPLE x 3")               // -> Ok(3600)
cart_total(prices, ["APPLE x 1", "KIWI x 2"]) // now: crash   after the fix: Error(UnknownSku("KIWI"))
```
