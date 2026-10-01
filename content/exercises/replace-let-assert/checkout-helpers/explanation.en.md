When `let assert` sits inside helper functions, the fix has a wider reach. The return type of `parse_line`, `#(String, Int)`, says "this always succeeds", so there is no channel for reporting a failure. That is why the solution **changes the types starting from the innermost function.**

1. `price_of` returns `Result(Int, CheckoutError)`. All it takes is turning the `Error(Nil)` from `dict.get` into `UnknownSku(sku)`.
2. `parse_line` checks the number of pieces with `case string.split(line, " x ")` to build `BadLine`, and moves parsing the quantity and checking its range into `parse_quantity`, which builds `BadQuantity`.
3. `line_total` chains the two helpers with `use ... <- result.try(...)`. Their order is the order of the checks.
4. The `let assert` inside the `fold` in `cart_total` becomes `list.try_fold`. As soon as a line gives an `Error`, it stops right there and that error becomes the result.

Once the possibility of failure shows up in the types, the compiler demands that every caller handle it. The moment you change a helper to return a `Result`, `line_total` stops compiling, so the compiler points out the places you missed. This process of turning partial functions into total ones is the **Total and partial functions (total-vs-partial-functions)** topic, and passing failures along with `use` and `try_fold` is the **Chaining Results and monads** topic.

Common mistakes:

- Getting rid of the crash by pricing an unknown product at 0 won with `result.unwrap(0)`. The payment amount is then quietly wrong.
- Adding up only the successful lines in `cart_total` with `result.values`. Checkout proceeds with the invalid lines silently left out of the total.
- Just deleting `let assert True = quantity >= 1` without moving the range check anywhere.
